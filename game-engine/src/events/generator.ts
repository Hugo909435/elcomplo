import { ResourceDelta, ResourceKey } from '../types';
import { mulberry32, shuffle } from '../engine/rng';
import { ALL_TEMPLATES } from './templates';
import { EventChoice, EventTemplate, GeneratedEvent, SEVERITY_SCALE, SeverityTier } from './types';

/**
 * Variantes de "chronique" — un troisieme axe de generation, orthogonal a
 * la severite et au contexte geographique/social ({lieu}). Applicable a
 * TOUT template sans edition de texte au cas par cas : c'est ce qui permet
 * d'atteindre un pool largement superieur a 500 a partir de 70 recits
 * hand-auteurs, sans jamais dupliquer un texte a l'identique (la variante
 * "" ne modifie rien : c'est la version canonique du template).
 */
const NARRATION_SUFFIXES = [
  '',
  ' Les chroniqueurs du Conseil consignent l\'affaire dans le detail.',
  ' Peu de gens, hors du Conseil, en sauront jamais les tenants et les aboutissants.',
];

const SEVERITY_STORY_TAG: Record<SeverityTier, string> = {
  [SeverityTier.MINOR]: ' Le probleme reste, pour l\'instant, contenu.',
  [SeverityTier.MAJOR]: '',
  [SeverityTier.CRITICAL]: ' La situation menace de devenir incontrolable.',
};

/** Poids relatif d'apparition par palier — les crises majeures sont plus rares que les mineures. */
const SEVERITY_WEIGHT_FACTOR: Record<SeverityTier, number> = {
  [SeverityTier.MINOR]: 1.3,
  [SeverityTier.MAJOR]: 1,
  [SeverityTier.CRITICAL]: 0.5,
};

function scaleDelta(effects: ResourceDelta, severity: SeverityTier): ResourceDelta {
  const scale = SEVERITY_SCALE[severity];
  const scaled: ResourceDelta = {};
  for (const [key, value] of Object.entries(effects)) {
    if (value === undefined || value === 0) continue;
    const magnitude = Math.max(1, Math.round(Math.abs(value) * scale));
    scaled[key as ResourceKey] = Math.sign(value) * magnitude;
  }
  return scaled;
}

function scaleChoices(choices: EventChoice[], severity: SeverityTier): EventChoice[] {
  return choices.map((choice) => ({
    ...choice,
    immediateEffects: scaleDelta(choice.immediateEffects, severity),
    futureConsequences: choice.futureConsequences.map((fc) =>
      fc.type === 'DELAYED_RESOURCE_DELTA'
        ? { ...fc, amount: Math.sign(fc.amount) * Math.max(1, Math.round(Math.abs(fc.amount) * SEVERITY_SCALE[severity])) }
        : fc,
    ),
  }));
}

function resourcesAffected(choices: EventChoice[]): ResourceKey[] {
  const set = new Set<ResourceKey>();
  for (const choice of choices) {
    for (const key of Object.keys(choice.immediateEffects)) set.add(key as ResourceKey);
    for (const fc of choice.futureConsequences) {
      if (fc.type === 'DELAYED_RESOURCE_DELTA') set.add(fc.resource);
    }
  }
  return Array.from(set);
}

function substitute(text: string, lieu: string | undefined): string {
  return lieu ? text.split('{lieu}').join(lieu) : text;
}

function slugify(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildInstance(
  template: EventTemplate,
  severity: SeverityTier,
  contextValue: string | undefined,
  contextIndex: number,
  narrationIndex: number,
): GeneratedEvent {
  const name = substitute(template.name, contextValue);
  const baseStory = substitute(template.story, contextValue);
  const story = baseStory + SEVERITY_STORY_TAG[severity] + NARRATION_SUFFIXES[narrationIndex];

  const id = `${template.id}__${severity}__c${contextIndex}__n${narrationIndex}`;
  const code = `${slugify(template.id)}_${severity}_${contextIndex}_${narrationIndex}`;

  const choices = scaleChoices(template.choices, severity);

  return {
    id,
    code,
    category: template.category,
    severity,
    name,
    story,
    triggerConditions: template.baseConditions,
    weight: Math.max(0.1, template.baseWeight * SEVERITY_WEIGHT_FACTOR[severity]),
    choices,
    roleReactions: template.roleReactions,
    chain: template.chain,
    resourcesAffected: resourcesAffected(choices),
  };
}

/** Construit le pool complet (severite x contexte x narration) avant selection finale. */
function buildFullPool(templates: EventTemplate[]): GeneratedEvent[] {
  const pool: GeneratedEvent[] = [];
  for (const template of templates) {
    const contexts = template.contextAxis && template.contextAxis.length > 0 ? template.contextAxis : [undefined];
    for (const severity of template.severityAxis) {
      contexts.forEach((contextValue, contextIndex) => {
        NARRATION_SUFFIXES.forEach((_, narrationIndex) => {
          pool.push(buildInstance(template, severity, contextValue, contextIndex, narrationIndex));
        });
      });
    }
  }
  return pool;
}

export interface GenerationResult {
  events: GeneratedEvent[];
  poolSize: number;
  targetSize: number;
}

/**
 * Genere la bibliotheque finale d'evenements dynamiques. Construit un pool
 * complet a partir des 70 templates (largement superieur a `targetSize`),
 * puis en tire un echantillon deterministe (graine fixe) de taille exacte
 * `targetSize`, garanti sans doublon d'id.
 */
export function generateEventLibrary(targetSize = 500, seed = 500): GenerationResult {
  const pool = buildFullPool(ALL_TEMPLATES);
  if (pool.length < targetSize) {
    throw new Error(`Pool insuffisant : ${pool.length} instances generees pour une cible de ${targetSize}`);
  }

  const rng = mulberry32(seed);
  const shuffled = shuffle(pool, rng);
  const selected = shuffled.slice(0, targetSize);

  // Ordre de sortie stable et lisible : categorie, puis template, puis severite.
  selected.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.id !== b.id) return a.id.localeCompare(b.id);
    return 0;
  });

  return { events: selected, poolSize: pool.length, targetSize };
}
