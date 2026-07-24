import type { Allegiance, PowerType } from '../types/game';

/** Libellés d'affichage des pouvoirs (partagés entre RoleSheet et ActionSheet). */
export const POWER_LABELS: Record<PowerType, { name: string; description: string; icon: string }> = {
  SPY_ALLEGIANCE: { name: 'Espionnage', description: "Découvre secrètement l'allégeance d'un autre joueur.", icon: '🔍' },
  FORCE_REVOTE: { name: 'Revote', description: 'Si le vote finit à égalité, il est rejoué — et chacun doit changer son choix.', icon: '🔁' },
  BLOCK_POWER: { name: 'Blocage', description: "Annule le pouvoir qu'un joueur activerait cette manche.", icon: '🚫' },
  BOOST_REGENT: { name: 'Voix double', description: 'En tant que Régent, ton vote compte double cette manche.', icon: '⚡' },
};

export const ALLEGIANCE_ICONS: Record<Allegiance, string> = {
  LOYALIST: '🛡️',
  CLAIMANT: '👑',
  FOREIGN_AGENT: '🗡️',
};

/** Est-ce que ce pouvoir exige une cible ? (miroir de POWER_REQUIRES_TARGET côté moteur.) */
export const POWER_NEEDS_TARGET: Record<PowerType, boolean> = {
  SPY_ALLEGIANCE: true,
  BLOCK_POWER: true,
  FORCE_REVOTE: false,
  BOOST_REGENT: false,
};

export const ALLEGIANCE_LABELS: Record<Allegiance, string> = {
  LOYALIST: 'Loyaliste',
  CLAIMANT: 'Prétendant',
  FOREIGN_AGENT: 'Agent étranger',
};
