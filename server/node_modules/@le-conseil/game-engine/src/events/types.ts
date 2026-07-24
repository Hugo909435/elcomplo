import { ResourceDelta, ResourceKey } from '../types';

// ============================================================================
// Systeme d'evenements dynamiques — independant du round-loop existant
// (CrisisCard/CrisisDeck). Un GeneratedEvent peut alimenter la phase CRISIS
// du GameEngine via un adaptateur, ou etre utilise comme calque narratif
// separe. Voir events/README au bas de generator.ts pour le point d'integration.
// ============================================================================

export enum EventCategory {
  ECONOMY = 'ECONOMY',
  WAR = 'WAR',
  RELIGION = 'RELIGION',
  PEOPLE = 'PEOPLE',
  POLITICS = 'POLITICS',
  CHAOS = 'CHAOS',
}

export enum SeverityTier {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

/** Multiplicateur applique aux effets "base" (ecrits au tarif MAJOR) selon la severite generee. */
export const SEVERITY_SCALE: Record<SeverityTier, number> = {
  [SeverityTier.MINOR]: 0.6,
  [SeverityTier.MAJOR]: 1,
  [SeverityTier.CRITICAL]: 1.6,
};

// ---- Conditions de declenchement — c'est ici que l'evenement "depend" de
// l'economie, la guerre, la religion, le bonheur du peuple et des decisions
// precedentes (via FLAG_SET/FLAG_NOT_SET, alimente par HistoryLedger). ----

export type EventCondition =
  | { type: 'RESOURCE_BELOW'; resource: ResourceKey; value: number }
  | { type: 'RESOURCE_ABOVE'; resource: ResourceKey; value: number }
  | { type: 'FLAG_SET'; flag: string }
  | { type: 'FLAG_NOT_SET'; flag: string }
  | { type: 'ROUND_AT_LEAST'; round: number }
  | { type: 'ROUND_AT_MOST'; round: number }
  | { type: 'ROLE_PRESENT'; roleCode: string };

// ---- Consequences futures — ce qui fait qu'un choix d'aujourd'hui pese sur
// les evenements de demain, condition de la "coherence narrative" demandee. ----

export type FutureConsequence =
  | { type: 'SET_FLAG'; flag: string }
  | { type: 'CLEAR_FLAG'; flag: string }
  | { type: 'DELAYED_RESOURCE_DELTA'; resource: ResourceKey; amount: number; roundsLater: number }
  | { type: 'WEIGHT_MODIFIER'; category: EventCategory; multiplier: number; durationRounds: number }
  | { type: 'ADVANCE_CHAIN'; chainId: string };

export interface RoleReaction {
  /** Code de role reference dans design/roles-50.md (ex: "Cardinal", "Assassin"). Couplage volontairement faible (chaine libre, pas d'enum partage). */
  roleCode: string;
  reaction: string;
}

export interface EventChoice {
  id: string;
  label: string;
  /** Deltas au tarif MAJOR ; mis a l'echelle par SEVERITY_SCALE a la generation. */
  immediateEffects: ResourceDelta;
  futureConsequences: FutureConsequence[];
}

export interface ChainInfo {
  chainId: string;
  chainName: string;
  stage: number;
  totalStages: number;
}

/**
 * Unite hand-auteur : un template couvre 1 a plusieurs GeneratedEvent via
 * ses axes de variation (severite x contexte). Le texte peut contenir
 * l'emplacement generique {lieu} (region, faction ou personnage selon le
 * template) remplace par une valeur de contextAxis a la generation.
 */
export interface EventTemplate {
  id: string;
  category: EventCategory;
  name: string;
  story: string;
  baseConditions: EventCondition[];
  baseWeight: number;
  choices: EventChoice[];
  roleReactions: RoleReaction[];
  chain?: ChainInfo;
  severityAxis: SeverityTier[];
  /** Valeurs substituees dans {lieu}. Vide/absent = pas de variation contextuelle. */
  contextAxis?: string[];
}

/** Instance finale, correspondant aux 8 champs demandes par l'utilisateur. */
export interface GeneratedEvent {
  id: string;
  code: string;
  category: EventCategory;
  severity: SeverityTier;
  name: string; // nom
  story: string; // histoire
  triggerConditions: EventCondition[]; // conditions d'apparition
  weight: number;
  choices: EventChoice[]; // choix possibles (+ consequences immediates/futures)
  roleReactions: RoleReaction[]; // reactions possibles des roles
  chain?: ChainInfo;
  resourcesAffected: ResourceKey[]; // ressources modifiees (derive des choix)
}
