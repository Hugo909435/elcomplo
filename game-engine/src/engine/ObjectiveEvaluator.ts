import { PlayerRuntime, ResourceState, SecretObjective } from '../types';

export interface ObjectiveEvaluationContext {
  finalResources: ResourceState;
  kingdomCollapsed: boolean;
  player: PlayerRuntime;
}

export class ObjectiveEvaluator {
  static evaluate(objective: SecretObjective, ctx: ObjectiveEvaluationContext): boolean {
    const { condition } = objective;

    switch (condition.type) {
      case 'RESOURCE_BELOW':
        return ctx.finalResources[condition.resource] < condition.value;
      case 'RESOURCE_ABOVE':
        return ctx.finalResources[condition.resource] > condition.value;
      case 'REGENT_AT_LEAST':
        return ctx.player.stats.regentCount >= condition.count;
      case 'VOTE_WITH_MAJORITY_AT_LEAST':
        return ctx.player.stats.votesWithMajority >= condition.count;
      case 'VOTE_AGAINST_REGENT_AT_LEAST':
        return ctx.player.stats.votesAgainstRegent >= condition.count;
      case 'NEVER_USE_POWER':
        return ctx.player.stats.powersUsed === 0;
      case 'SURVIVE_UNREVEALED':
        return !ctx.player.revealed;
      case 'KINGDOM_SURVIVES':
        return !ctx.kingdomCollapsed;
      case 'KINGDOM_COLLAPSES':
        return ctx.kingdomCollapsed;
      default: {
        const exhaustiveCheck: never = condition;
        return exhaustiveCheck;
      }
    }
  }
}
