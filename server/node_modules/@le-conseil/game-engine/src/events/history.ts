import { ResourceDelta, ResourceKey } from '../types';
import { EventCategory, FutureConsequence } from './types';

interface WeightModifierEntry {
  category: EventCategory;
  multiplier: number;
  expiresAfterRound: number;
}

interface DelayedEffectEntry {
  resource: ResourceKey;
  amount: number;
  triggerRound: number;
}

/**
 * Memoire de la partie : flags poses par les decisions passees, chaines en
 * cours, effets differes, et biais de ponderation temporaires. C'est ce qui
 * permet aux evenements de "dependre des decisions precedentes" et donne au
 * royaume une continuite narrative d'un tour a l'autre.
 */
export class HistoryLedger {
  private flags = new Set<string>();
  private usedEventIds = new Set<string>();
  private chainStage = new Map<string, number>();
  private weightModifiers: WeightModifierEntry[] = [];
  private delayedEffects: DelayedEffectEntry[] = [];

  setFlag(flag: string): void {
    this.flags.add(flag);
  }

  clearFlag(flag: string): void {
    this.flags.delete(flag);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  markUsed(eventId: string): void {
    this.usedEventIds.add(eventId);
  }

  wasUsed(eventId: string): boolean {
    return this.usedEventIds.has(eventId);
  }

  advanceChain(chainId: string): number {
    const next = (this.chainStage.get(chainId) ?? 0) + 1;
    this.chainStage.set(chainId, next);
    return next;
  }

  getChainStage(chainId: string): number {
    return this.chainStage.get(chainId) ?? 0;
  }

  addWeightModifier(category: EventCategory, multiplier: number, currentRound: number, durationRounds: number): void {
    this.weightModifiers.push({ category, multiplier, expiresAfterRound: currentRound + durationRounds });
  }

  /** Produit combine de tous les modificateurs actifs pour une categorie, a un round donne. */
  getWeightMultiplier(category: EventCategory, currentRound: number): number {
    return this.weightModifiers
      .filter((m) => m.category === category && m.expiresAfterRound >= currentRound)
      .reduce((product, m) => product * m.multiplier, 1);
  }

  scheduleDelayedEffect(resource: ResourceKey, amount: number, currentRound: number, roundsLater: number): void {
    this.delayedEffects.push({ resource, amount, triggerRound: currentRound + roundsLater });
  }

  /** A appeler en debut de round : renvoie et retire les effets differes qui se declenchent maintenant. */
  consumeDueDelayedEffects(currentRound: number): ResourceDelta {
    const due = this.delayedEffects.filter((e) => e.triggerRound === currentRound);
    this.delayedEffects = this.delayedEffects.filter((e) => e.triggerRound !== currentRound);

    const delta: ResourceDelta = {};
    for (const effect of due) {
      delta[effect.resource] = (delta[effect.resource] ?? 0) + effect.amount;
    }
    return delta;
  }

  /** Applique les consequences futures d'un choix : pose des flags, programme des effets, avance des chaines. */
  applyFutureConsequences(consequences: FutureConsequence[], currentRound: number): void {
    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'SET_FLAG':
          this.setFlag(consequence.flag);
          break;
        case 'CLEAR_FLAG':
          this.clearFlag(consequence.flag);
          break;
        case 'DELAYED_RESOURCE_DELTA':
          this.scheduleDelayedEffect(consequence.resource, consequence.amount, currentRound, consequence.roundsLater);
          break;
        case 'WEIGHT_MODIFIER':
          this.addWeightModifier(consequence.category, consequence.multiplier, currentRound, consequence.durationRounds);
          break;
        case 'ADVANCE_CHAIN':
          this.advanceChain(consequence.chainId);
          break;
      }
    }
  }
}
