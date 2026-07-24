import { DEFAULT_CONFIG } from './config/gameConfig';
import { ResourceManager } from './engine/ResourceManager';
import { mulberry32 } from './engine/rng';
import { EventSelector, generateEventLibrary, HistoryLedger } from './events';
import { ResourceState } from './types';

function printLibraryStats(): ReturnType<typeof generateEventLibrary> {
  const result = generateEventLibrary(500, 500);
  const ids = new Set(result.events.map((e) => e.id));
  const codes = new Set(result.events.map((e) => e.code));

  console.log('=== Bibliotheque generee ===');
  console.log(`Pool complet (severite x contexte x chronique) : ${result.poolSize} instances`);
  console.log(`Selection finale : ${result.events.length} evenements | ids uniques: ${ids.size} | codes uniques: ${codes.size}`);

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let withChain = 0;
  for (const e of result.events) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    if (e.chain) withChain += 1;
  }
  console.log('Par categorie :', byCategory);
  console.log('Par severite :', bySeverity);
  console.log(`Etapes de chaines narratives incluses : ${withChain}`);
  console.log();

  if (ids.size !== 500 || result.events.length !== 500) {
    throw new Error('La bibliotheque generee ne contient pas exactement 500 evenements uniques.');
  }

  return result;
}

function simulateCoherentPlaythrough(library: ReturnType<typeof generateEventLibrary>['events']): void {
  console.log('=== Simulation d\'une partie (15 manches, choix deterministes) ===');

  const selector = new EventSelector(library);
  const history = new HistoryLedger();
  const rng = mulberry32(7);

  const rolesInPlay = new Set([
    'Cardinal', 'Général', 'Marchand', 'Espion', 'Révolutionnaire', 'Sorcier',
    'Chevalier', 'Assassin', 'Duc', 'Prophète', 'Bâtard Royal', 'Contrebandier',
  ]);

  let resources: ResourceState = { ...DEFAULT_CONFIG.startingResources };
  const chainsSeenComplete = new Set<string>();

  for (let round = 1; round <= 15; round++) {
    const delayed = history.consumeDueDelayedEffects(round);
    if (Object.keys(delayed).length > 0) {
      resources = ResourceManager.applyDelta(resources, delayed, DEFAULT_CONFIG.resourceBounds);
      console.log(`[Manche ${round}] Effet differe applique :`, delayed);
    }

    const event = selector.selectNext({ resources, round, history, rolesInPlay }, rng);
    if (!event) {
      console.log(`[Manche ${round}] Aucun evenement eligible.`);
      continue;
    }

    const choice = event.choices[0];
    resources = ResourceManager.applyDelta(resources, choice.immediateEffects, DEFAULT_CONFIG.resourceBounds);
    history.markUsed(event.id);
    history.applyFutureConsequences(choice.futureConsequences, round);

    const chainTag = event.chain ? ` [chaine: ${event.chain.chainName} — etape ${event.chain.stage}/${event.chain.totalStages}]` : '';
    console.log(`[Manche ${round}] (${event.category}/${event.severity}) ${event.name}${chainTag}`);
    console.log(`  -> choix: "${choice.label}" | ressources:`, resources);

    if (event.chain && event.chain.stage === event.chain.totalStages) {
      chainsSeenComplete.add(event.chain.chainId);
    }
  }

  console.log();
  console.log('Chaines narratives menees a leur terme durant cette simulation :', Array.from(chainsSeenComplete));
  if (chainsSeenComplete.size === 0) {
    console.log('(Aucune chaine achevee sur cette graine/duree — augmenter le nombre de manches simulees pour en observer une.)');
  }
}

const library = printLibraryStats();
simulateCoherentPlaythrough(library.events);
