import { ResourceState } from '../types';
import { RandomFn, shuffle } from '../engine/rng';
import { evaluateConditions } from './conditions';
import { HistoryLedger } from './history';
import { EventCategory, GeneratedEvent } from './types';

export interface SelectionContext {
  resources: ResourceState;
  round: number;
  history: HistoryLedger;
  rolesInPlay: Set<string>;
}

/**
 * Selectionne le prochain evenement a jouer parmi la bibliotheque generee,
 * en tenant compte de l'etat courant du royaume et de son historique. C'est
 * ici que le systeme devient "dynamique" plutot qu'un simple tirage dans un
 * paquet fixe.
 *
 * Regles de priorite :
 * 1. Un evenement deja joue n'est jamais rejoue (pas de repetition).
 * 2. Seuls les evenements dont triggerConditions sont satisfaites sont
 *    eligibles (dependance economie/guerre/religion/bonheur/decisions).
 * 3. La suite d'une chaine narrative deja entamee est fortement privilegiee
 *    (boost x8) pour que les arcs se terminent plutot que de se diluer dans
 *    le tirage aleatoire — c'est ce qui garantit la coherence de l'histoire.
 * 4. Le poids de chaque candidat est ensuite ajuste par les modificateurs
 *    temporaires poses par HistoryLedger (WEIGHT_MODIFIER).
 */
export class EventSelector {
  constructor(private readonly library: GeneratedEvent[]) {}

  selectNext(ctx: SelectionContext, rng: RandomFn): GeneratedEvent | null {
    const candidates = this.library.filter((event) => {
      if (ctx.history.wasUsed(event.id)) return false;
      return evaluateConditions(event.triggerConditions, {
        resources: ctx.resources,
        round: ctx.round,
        history: ctx.history,
        rolesInPlay: ctx.rolesInPlay,
      });
    });

    if (candidates.length === 0) return null;

    const weighted = candidates.map((event) => ({
      event,
      weight: this.computeWeight(event, ctx),
    }));

    return weightedPick(weighted, rng);
  }

  private computeWeight(event: GeneratedEvent, ctx: SelectionContext): number {
    let weight = event.weight;

    if (event.chain) {
      const currentStage = ctx.history.getChainStage(event.chain.chainId);
      const isNextExpectedStage = event.chain.stage === currentStage + 1;
      if (isNextExpectedStage) {
        weight *= 8;
      } else if (event.chain.stage !== 1) {
        // Etape d'une chaine non encore atteinte a ce point : exclue de facto
        // (poids quasi nul) plutot que retiree, pour rester visible en debug.
        weight *= 0.01;
      }
    }

    weight *= ctx.history.getWeightMultiplier(event.category as EventCategory, ctx.round);

    return Math.max(0.001, weight);
  }
}

function weightedPick<T>(items: Array<{ event: T; weight: number }>, rng: RandomFn): T {
  const shuffled = shuffle(items, rng); // casse les ties/biais d'ordre avant le tirage pondere
  const total = shuffled.reduce((sum, i) => sum + i.weight, 0);
  let roll = rng() * total;
  for (const item of shuffled) {
    roll -= item.weight;
    if (roll <= 0) return item.event;
  }
  return shuffled[shuffled.length - 1].event;
}
