import { GameConfig, ResourceKey } from '../types';

/**
 * Configuration par defaut d'une partie du Conseil.
 *
 * Les seuils ci-dessous encodent directement plusieurs garde-fous de design :
 * - maxSingleCrisisImpact borne les effets d'une crise pour qu'aucun tirage
 *   malchanceux ne puisse, a lui seul, faire tomber une ressource pleine a
 *   zero (empeche un effondrement "victoire trop facile" au tour 1).
 * - claimantSupportThresholdRatio est applique a totalRounds pour calculer
 *   un nombre minimal de manches gagnees ; il est donc mathematiquement
 *   impossible de remporter la couronne avant plusieurs manches jouees.
 */
export const DEFAULT_CONFIG: GameConfig = {
  minPlayers: 3,
  maxPlayers: 8,
  totalRounds: 7,
  resourceBounds: { min: 0, max: 10 },
  startingResources: {
    [ResourceKey.TREASURY]: 6,
    [ResourceKey.STABILITY]: 6,
    [ResourceKey.ARMY]: 6,
    [ResourceKey.FAITH]: 6,
  },
  collapseThreshold: 0,
  survivalThreshold: 3,
  claimantSupportThresholdRatio: 0.6,
  maxSingleCrisisImpact: 4,
  negotiationDurationMs: 90_000,
  voteDurationMs: 20_000,
  // Bareme du classement final : gagner pour son camp vaut plus que reussir
  // sa mission perso, mais les deux comptent (max 3 points = camp + objectif).
  scoring: {
    campVictory: 2,
    objective: 1,
  },
};
