import { ConfigurationImbalanceError, InvalidPlayerCountError } from '../errors';

export interface RoleDistribution {
  claimants: number;
  foreignAgents: number;
}

/**
 * Table de repartition des allegeances par nombre de joueurs.
 *
 * Regles d'equilibrage encodees dans cette table (cf. contrainte "aucun role
 * desequilibre") :
 * - a 3 joueurs, aucun Agent etranger : la dynamique de trahison a 3 exige
 *   trop d'information cachee pour rester lisible, on garde un duel
 *   Loyalistes / Pretendant.
 * - le nombre d'Agents etrangers ne peut jamais atteindre la majorite de la
 *   table (verifie a l'execution dans getRoleDistribution).
 * - il reste toujours au moins un Loyaliste (sinon "le royaume" n'a plus de
 *   camp a defendre et la partie n'a plus de sens).
 */
export const ROLE_DISTRIBUTION_TABLE: Record<number, RoleDistribution> = {
  3: { claimants: 1, foreignAgents: 0 },
  4: { claimants: 1, foreignAgents: 1 },
  5: { claimants: 1, foreignAgents: 1 },
  6: { claimants: 1, foreignAgents: 1 },
  7: { claimants: 1, foreignAgents: 2 },
  8: { claimants: 2, foreignAgents: 2 },
};

export function getRoleDistribution(playerCount: number): RoleDistribution {
  const distribution = ROLE_DISTRIBUTION_TABLE[playerCount];
  if (!distribution) {
    throw new InvalidPlayerCountError(
      `Le Conseil se joue de 3 a 8 joueurs (repartition manquante pour ${playerCount})`,
    );
  }

  const loyalists = playerCount - distribution.claimants - distribution.foreignAgents;
  if (loyalists < 1) {
    throw new ConfigurationImbalanceError(
      `La repartition pour ${playerCount} joueurs ne laisse aucun Loyaliste`,
    );
  }
  if (distribution.foreignAgents >= Math.ceil(playerCount / 2)) {
    throw new ConfigurationImbalanceError(
      `Les Agents etrangers (${distribution.foreignAgents}) ne peuvent pas approcher la majorite a ${playerCount} joueurs`,
    );
  }
  if (distribution.claimants >= playerCount) {
    throw new ConfigurationImbalanceError('Le nombre de Pretendants ne peut pas egaler le nombre de joueurs');
  }

  return distribution;
}
