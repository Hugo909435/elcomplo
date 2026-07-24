export type RandomFn = () => number; // borne [0, 1)

/**
 * PRNG deterministe (mulberry32). Permet de rejouer une partie a l'identique
 * a partir d'une graine (tests, replays, audits d'equilibrage) sans
 * dependre de Math.random().
 */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Melange de Fisher-Yates, non destructif, pilote par un RandomFn injecte. */
export function shuffle<T>(items: readonly T[], rng: RandomFn): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
