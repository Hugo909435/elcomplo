import { ConfigurationImbalanceError, ContentPoolExhaustedError } from '../errors';
import { Allegiance, ResourceKey, SecretObjective } from '../types';

/**
 * Chaque objectif doit demander de VRAIS choix au joueur pour etre reussi.
 *
 * NOTE DE DESIGN — pas d'objectif "REGENT_AT_LEAST" dans ce pool par defaut :
 * la regence tourne dans un ordre fixe (engine/schedule.ts) et un joueur ne
 * peut jamais eviter d'etre Regent quand son siege arrive. Un objectif du type
 * "sois Regent N fois" est donc soit gagne d'avance (si le siege le garantit),
 * soit impossible — sans aucune agentivite. La condition REGENT_AT_LEAST reste
 * disponible pour des pools personnalises combines a d'autres regles, mais on
 * ne l'utilise pas seule ici.
 */
export const DEFAULT_SECRET_OBJECTIVES: SecretObjective[] = [
  {
    id: 'obj-tresor-bas',
    code: 'TRESOR_BAS',
    description: 'Le Tresor doit terminer la partie sous 3.',
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 3 },
  },
  {
    id: 'obj-foi-haute',
    code: 'FOI_HAUTE',
    description: 'La Foi doit terminer la partie au-dessus de 7.',
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'RESOURCE_ABOVE', resource: ResourceKey.FAITH, value: 7 },
  },
  {
    id: 'obj-dans-le-vent',
    code: 'DANS_LE_VENT',
    description: "Vote au moins 4 fois avec l'option finalement retenue.",
    compatibleAllegiances: 'ANY',
    difficulty: 'EASY',
    condition: { type: 'VOTE_WITH_MAJORITY_AT_LEAST', count: 4 },
  },
  {
    id: 'obj-contestataire',
    code: 'CONTESTATAIRE',
    description: 'Vote au moins 3 fois contre le choix du Regent en exercice.',
    compatibleAllegiances: 'ANY',
    difficulty: 'HARD',
    condition: { type: 'VOTE_AGAINST_REGENT_AT_LEAST', count: 3 },
  },
  {
    id: 'obj-mains-propres',
    code: 'MAINS_PROPRES',
    description: "N'utilise jamais ton pouvoir secret.",
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'NEVER_USE_POWER' },
  },
  {
    id: 'obj-ombre',
    code: 'OMBRE',
    description: "Termine la partie sans que ton allegeance n'ait ete percee a jour.",
    compatibleAllegiances: [Allegiance.CLAIMANT, Allegiance.FOREIGN_AGENT],
    difficulty: 'HARD',
    condition: { type: 'SURVIVE_UNREVEALED' },
  },
  {
    id: 'obj-royaume-uni',
    code: 'ROYAUME_UNI',
    description: 'Le royaume doit survivre a la succession.',
    compatibleAllegiances: [Allegiance.LOYALIST, Allegiance.CLAIMANT],
    difficulty: 'EASY',
    condition: { type: 'KINGDOM_SURVIVES' },
  },
  {
    id: 'obj-chaos-fertile',
    code: 'CHAOS_FERTILE',
    description: 'Le royaume doit sombrer dans le chaos.',
    compatibleAllegiances: [Allegiance.FOREIGN_AGENT],
    difficulty: 'MEDIUM',
    condition: { type: 'KINGDOM_COLLAPSES' },
  },
  {
    id: 'obj-armee-forte',
    code: 'ARMEE_FORTE',
    description: "L'Armee doit terminer la partie au-dessus de 7.",
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'RESOURCE_ABOVE', resource: ResourceKey.ARMY, value: 7 },
  },
  {
    id: 'obj-pilier',
    code: 'PILIER_DU_CONSEIL',
    description: "Vote au moins 5 fois avec l'option finalement retenue.",
    compatibleAllegiances: 'ANY',
    difficulty: 'HARD',
    condition: { type: 'VOTE_WITH_MAJORITY_AT_LEAST', count: 5 },
  },
  {
    id: 'obj-stabilite-haute',
    code: 'PAIX_INTERIEURE',
    description: 'La Stabilite doit terminer la partie au-dessus de 7.',
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'RESOURCE_ABOVE', resource: ResourceKey.STABILITY, value: 7 },
  },
  {
    id: 'obj-armee-basse',
    code: 'ROYAUME_DESARME',
    description: "L'Armee doit terminer la partie sous 4.",
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'RESOURCE_BELOW', resource: ResourceKey.ARMY, value: 4 },
  },
  {
    id: 'obj-frondeur',
    code: 'FRONDEUR',
    description: 'Vote au moins 2 fois contre le choix du Regent en exercice.',
    compatibleAllegiances: 'ANY',
    difficulty: 'MEDIUM',
    condition: { type: 'VOTE_AGAINST_REGENT_AT_LEAST', count: 2 },
  },
];

const ALL_ALLEGIANCES = [Allegiance.LOYALIST, Allegiance.CLAIMANT, Allegiance.FOREIGN_AGENT];

/**
 * Empeche deux categories de desequilibre :
 * 1. un pool trop petit, ou ne couvrant pas toutes les allegeances possibles
 *    (une allegeance sans objectif compatible bloquerait l'assignation) ;
 * 2. un pool compose uniquement d'objectifs EASY, qui rendrait les
 *    victoires personnelles triviales des 4 joueurs et plus.
 */
export function validateObjectivePool(pool: SecretObjective[], playerCount: number): void {
  if (pool.length < playerCount) {
    throw new ContentPoolExhaustedError(
      `Le pool d'objectifs secrets (${pool.length}) est trop petit pour ${playerCount} joueurs`,
    );
  }

  const anyCompatibleCount = pool.filter((o) => o.compatibleAllegiances === 'ANY').length;
  for (const allegiance of ALL_ALLEGIANCES) {
    const specificCount = pool.filter(
      (o) => o.compatibleAllegiances !== 'ANY' && o.compatibleAllegiances.includes(allegiance),
    ).length;
    if (specificCount + anyCompatibleCount < 1) {
      throw new ContentPoolExhaustedError(`Aucun objectif secret compatible avec l'allegeance ${allegiance}`);
    }
  }

  const nonEasyCount = pool.filter((o) => o.difficulty !== 'EASY').length;
  if (playerCount >= 4 && nonEasyCount < 1) {
    throw new ConfigurationImbalanceError(
      'Le pool doit contenir au moins un objectif MEDIUM ou HARD pour les parties a 4 joueurs ou plus',
    );
  }
}
