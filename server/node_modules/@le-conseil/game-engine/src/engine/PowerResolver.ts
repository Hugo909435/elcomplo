import { PlayerRuntime, PowerActionRecord, PowerType } from '../types';

export interface PowerIntent {
  playerId: string;
  power: PowerType;
  targetPlayerId?: string;
}

export interface PowerResolutionResult {
  applied: PowerActionRecord[];
  blocked: PowerActionRecord[];
  /** playerId -> resultat prive de son pouvoir (ex: allegeance espionnee, notification de blocage). Jamais broadcast. */
  privateResults: Map<string, unknown>;
}

export const POWER_REQUIRES_TARGET: Record<PowerType, boolean> = {
  [PowerType.SPY_ALLEGIANCE]: true,
  [PowerType.FORCE_REVOTE]: false,
  [PowerType.BLOCK_POWER]: true,
  [PowerType.BOOST_REGENT]: false,
};

export class PowerResolver {
  /**
   * Resout tous les pouvoirs actives durant la phase POWERS d'une manche.
   *
   * REGLE DE ROBUSTESSE : cette methode ne leve JAMAIS d'exception. Les
   * intentions ont ete validees a l'enregistrement (GameEngine.usePower) ;
   * si l'etat a change entre-temps (ex: la cible s'est deconnectee), l'intention
   * est degradee en action "blocked" au lieu de faire echouer la transition
   * de phase — un throw ici bloquait definitivement la partie en phase POWERS.
   *
   * Ordre de resolution : BLOCK_POWER est applique en premier pour annuler
   * les intentions qu'il cible, avant que les autres pouvoirs ne produisent
   * leur effet — un pouvoir bloque ne doit jamais avoir de resultat visible.
   */
  static resolve(intents: PowerIntent[], players: Map<string, PlayerRuntime>): PowerResolutionResult {
    const applied: PowerActionRecord[] = [];
    const blocked: PowerActionRecord[] = [];
    const privateResults = new Map<string, unknown>();

    const validIntents = intents.filter((intent) => PowerResolver.isStillValid(intent, players));
    const invalidIntents = intents.filter((intent) => !PowerResolver.isStillValid(intent, players));
    for (const intent of invalidIntents) {
      blocked.push({ playerId: intent.playerId, power: intent.power, targetPlayerId: intent.targetPlayerId });
      privateResults.set(intent.playerId, { type: 'POWER_FIZZLED', power: intent.power });
    }

    const blockIntents = validIntents.filter((i) => i.power === PowerType.BLOCK_POWER);
    const blockedActorIds = new Set(blockIntents.map((i) => i.targetPlayerId));

    for (const intent of validIntents) {
      const record: PowerActionRecord = {
        playerId: intent.playerId,
        power: intent.power,
        targetPlayerId: intent.targetPlayerId,
      };

      if (intent.power !== PowerType.BLOCK_POWER && blockedActorIds.has(intent.playerId)) {
        blocked.push(record);
        privateResults.set(intent.playerId, { type: 'POWER_BLOCKED', power: intent.power });
        continue;
      }

      applied.push(record);
      const actor = players.get(intent.playerId)!;
      const power = actor.powers.find((p) => p.type === intent.power)!;
      power.usesRemaining -= 1;
      actor.stats.powersUsed += 1;

      if (intent.power === PowerType.SPY_ALLEGIANCE) {
        const target = players.get(intent.targetPlayerId!)!;
        privateResults.set(intent.playerId, {
          type: 'SPY_RESULT',
          targetPlayerId: target.id,
          allegiance: target.allegiance,
        });
      }
    }

    return { applied, blocked, privateResults };
  }

  /** Re-verification silencieuse au moment de la resolution (l'etat a pu changer depuis l'enregistrement). */
  private static isStillValid(intent: PowerIntent, players: Map<string, PlayerRuntime>): boolean {
    const actor = players.get(intent.playerId);
    if (!actor) return false;

    const power = actor.powers.find((p) => p.type === intent.power);
    if (!power || power.usesRemaining <= 0) return false;

    if (POWER_REQUIRES_TARGET[intent.power]) {
      if (!intent.targetPlayerId || intent.targetPlayerId === intent.playerId) return false;
      const target = players.get(intent.targetPlayerId);
      if (!target) return false;
      // Une cible deconnectee reste valide pour l'espionnage/blocage : son
      // allegeance existe toujours. Seule une cible inexistante invalide.
    }
    return true;
  }
}
