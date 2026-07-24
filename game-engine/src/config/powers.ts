import { PowerType } from '../types';

export const POWER_CYCLE: PowerType[] = [
  PowerType.SPY_ALLEGIANCE,
  PowerType.FORCE_REVOTE,
  PowerType.BLOCK_POWER,
  PowerType.BOOST_REGENT,
];

export const POWER_USES_PER_GAME: Record<PowerType, number> = {
  [PowerType.SPY_ALLEGIANCE]: 2,
  [PowerType.FORCE_REVOTE]: 1,
  [PowerType.BLOCK_POWER]: 1,
  [PowerType.BOOST_REGENT]: 2,
};

/**
 * Poids de puissance relative de chaque pouvoir, utilise par le systeme
 * d'equilibrage pour detecter un role hostile surpuissant. BLOCK_POWER
 * (deni pur d'un pouvoir adverse) est le plus fort ; SPY_ALLEGIANCE et
 * BOOST_REGENT sont forts mais conditionnels ; FORCE_REVOTE est le plus
 * situationnel (perdu si le vote n'est pas serre).
 */
export const POWER_WEIGHT: Record<PowerType, number> = {
  [PowerType.BLOCK_POWER]: 4,
  [PowerType.SPY_ALLEGIANCE]: 3,
  [PowerType.BOOST_REGENT]: 3,
  [PowerType.FORCE_REVOTE]: 2,
};
