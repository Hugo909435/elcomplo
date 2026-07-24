import { ResourceState } from '../types';
import { HistoryLedger } from './history';
import { EventCondition } from './types';

export interface ConditionContext {
  resources: ResourceState;
  round: number;
  history: HistoryLedger;
  /** Codes de role presents dans la partie (ex: "Cardinal", "Assassin"). */
  rolesInPlay: Set<string>;
}

/**
 * Evalue un ensemble de conditions en ET logique. C'est le point unique ou
 * les quatre axes de dependance demandes se rejoignent : ressources
 * (economie/guerre/religion/bonheur), round (rythme de partie), et flags
 * d'historique (decisions precedentes).
 */
export function evaluateConditions(conditions: EventCondition[], ctx: ConditionContext): boolean {
  return conditions.every((condition) => evaluateOne(condition, ctx));
}

function evaluateOne(condition: EventCondition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case 'RESOURCE_BELOW':
      return ctx.resources[condition.resource] < condition.value;
    case 'RESOURCE_ABOVE':
      return ctx.resources[condition.resource] > condition.value;
    case 'FLAG_SET':
      return ctx.history.hasFlag(condition.flag);
    case 'FLAG_NOT_SET':
      return !ctx.history.hasFlag(condition.flag);
    case 'ROUND_AT_LEAST':
      return ctx.round >= condition.round;
    case 'ROUND_AT_MOST':
      return ctx.round <= condition.round;
    case 'ROLE_PRESENT':
      return ctx.rolesInPlay.has(condition.roleCode);
    default: {
      const exhaustiveCheck: never = condition;
      return exhaustiveCheck;
    }
  }
}
