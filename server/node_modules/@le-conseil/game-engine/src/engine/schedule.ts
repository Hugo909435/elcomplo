/**
 * Calculs de rotation du Regent. La regence tourne en ordre de siege strict :
 * la manche r (1-indexee) est presidee par le siege (r-1) % playerCount.
 * Centraliser ce calcul permet a la fois au moteur (pickNextRegent), a
 * l'attribution d'objectifs (faisabilite par siege) et a l'evaluation de la
 * victoire du Pretendant (seuil proportionnel aux opportunites reelles)
 * d'utiliser exactement la meme verite.
 */

/** Nombre de manches ou le siege donne sera Regent sur l'ensemble de la partie. */
export function regenciesForSeat(seatIndex: number, playerCount: number, totalRounds: number): number {
  if (seatIndex >= totalRounds) return 0;
  return Math.floor((totalRounds - 1 - seatIndex) / playerCount) + 1;
}

/**
 * Jetons de soutien requis pour qu'un Pretendant a ce siege soit couronne.
 * Proportionnel a ses regences reelles (corrige l'ancien seuil global qui
 * rendait la victoire mathematiquement impossible) : 1 regence -> 1 jeton,
 * 2 regences -> 2 jetons, 3 regences -> 2 jetons (ratio 0.6 par defaut).
 */
export function claimantTokensRequired(
  seatIndex: number,
  playerCount: number,
  totalRounds: number,
  ratio: number,
): number {
  const regencies = regenciesForSeat(seatIndex, playerCount, totalRounds);
  return Math.max(1, Math.ceil(regencies * ratio));
}

/**
 * Nombre de manches effectif d'une partie : jamais moins que le nombre de
 * joueurs, pour que chaque siege soit Regent au moins une fois (equite de la
 * rotation, faisabilite de BOOST_REGENT et des objectifs lies a la regence).
 */
export function effectiveTotalRounds(configuredRounds: number, playerCount: number): number {
  return Math.max(configuredRounds, playerCount);
}
