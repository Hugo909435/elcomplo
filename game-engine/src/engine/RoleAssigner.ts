import { getRoleDistribution } from '../config/roleDistribution';
import { validateRolePool } from '../content/roles';
import { ContentPoolExhaustedError } from '../errors';
import { Allegiance, ObjectiveCondition, RoleDefinition, SecretObjective } from '../types';
import { RandomFn, shuffle } from './rng';
import { regenciesForSeat } from './schedule';

export interface SeatedPlayer {
  id: string;
  seatIndex: number;
}

export interface RoleAssignment {
  allegiance: Allegiance;
  roleId: string;
  secretObjectiveId: string;
}

export interface RoleAssignerParams {
  players: SeatedPlayer[];
  objectivePool: SecretObjective[];
  rolePool: RoleDefinition[];
  totalRounds: number;
  rng: RandomFn;
}

/**
 * Un objectif ne doit jamais etre structurellement irrealisable pour le
 * siege qui le recoit (ex: "sois Regent 2 fois" pour un siege qui ne
 * presidera qu'une seule manche). Cette fonction encode la faisabilite d'une
 * condition en fonction de la place du joueur dans la rotation.
 */
export function isObjectiveFeasibleForSeat(
  condition: ObjectiveCondition,
  seatIndex: number,
  playerCount: number,
  totalRounds: number,
): boolean {
  const regencies = regenciesForSeat(seatIndex, playerCount, totalRounds);
  switch (condition.type) {
    case 'REGENT_AT_LEAST':
      return condition.count <= regencies;
    case 'VOTE_AGAINST_REGENT_AT_LEAST':
      // On ne peut voter contre le Regent que les manches ou on ne l'est pas.
      return condition.count <= totalRounds - regencies;
    case 'VOTE_WITH_MAJORITY_AT_LEAST':
      return condition.count <= totalRounds;
    default:
      return true;
  }
}

export class RoleAssigner {
  /**
   * Attribue allegeance + role nomme + objectif secret a chaque joueur.
   *
   * Garde-fous appliques :
   * - la table de distribution fixe le nombre de joueurs par allegeance ;
   * - chaque joueur recoit un role distinct compatible avec son allegeance ;
   * - un objectif structurellement irrealisable pour le siege du joueur
   *   n'est jamais distribue (cf. isObjectiveFeasibleForSeat) ;
   * - au plus floor(n/2) objectifs EASY, et au moins un MEDIUM/HARD a
   *   partir de 4 joueurs.
   */
  static assign(params: RoleAssignerParams): Map<string, RoleAssignment> {
    const { players, objectivePool, rolePool, totalRounds, rng } = params;
    const distribution = getRoleDistribution(players.length);
    const loyalistCount = players.length - distribution.claimants - distribution.foreignAgents;

    validateRolePool(rolePool, {
      [Allegiance.LOYALIST]: loyalistCount,
      [Allegiance.CLAIMANT]: distribution.claimants,
      [Allegiance.FOREIGN_AGENT]: distribution.foreignAgents,
    });

    const allegiancePool: Allegiance[] = [
      ...Array(distribution.claimants).fill(Allegiance.CLAIMANT),
      ...Array(distribution.foreignAgents).fill(Allegiance.FOREIGN_AGENT),
      ...Array(loyalistCount).fill(Allegiance.LOYALIST),
    ];

    const shuffledPlayers = shuffle(players, rng);
    const allegianceByPlayer = new Map<string, Allegiance>();
    shuffledPlayers.forEach((player, index) => {
      allegianceByPlayer.set(player.id, allegiancePool[index]);
    });

    // Roles : tirage sans remise parmi les roles de l'allegeance du joueur.
    const availableRoles = shuffle(rolePool, rng);
    const roleByPlayer = new Map<string, string>();
    for (const player of shuffledPlayers) {
      const allegiance = allegianceByPlayer.get(player.id)!;
      const index = availableRoles.findIndex((r) => r.allegiance === allegiance);
      if (index === -1) {
        throw new ContentPoolExhaustedError(`Aucun role restant pour l'allegeance ${allegiance}`);
      }
      const [role] = availableRoles.splice(index, 1);
      roleByPlayer.set(player.id, role.id);
    }

    const seatByPlayer = new Map(players.map((p) => [p.id, p.seatIndex]));
    const objectiveByPlayer = RoleAssigner.assignObjectives(
      shuffledPlayers.map((p) => p.id),
      allegianceByPlayer,
      seatByPlayer,
      players.length,
      totalRounds,
      objectivePool,
      rng,
    );

    const result = new Map<string, RoleAssignment>();
    for (const player of shuffledPlayers) {
      result.set(player.id, {
        allegiance: allegianceByPlayer.get(player.id)!,
        roleId: roleByPlayer.get(player.id)!,
        secretObjectiveId: objectiveByPlayer.get(player.id)!,
      });
    }
    return result;
  }

  private static assignObjectives(
    playerIds: string[],
    allegianceByPlayer: Map<string, Allegiance>,
    seatByPlayer: Map<string, number>,
    playerCount: number,
    totalRounds: number,
    pool: SecretObjective[],
    rng: RandomFn,
  ): Map<string, string> {
    const assigned = new Map<string, string>();
    const usedObjectiveIds = new Set<string>();

    const maxEasy = Math.floor(playerIds.length / 2);
    let easyUsed = 0;
    let mediumOrHardUsed = 0;

    const drawOrder = shuffle(playerIds, rng);

    drawOrder.forEach((playerId, index) => {
      const allegiance = allegianceByPlayer.get(playerId)!;
      const seatIndex = seatByPlayer.get(playerId)!;
      const compatible = pool.filter(
        (objective) =>
          !usedObjectiveIds.has(objective.id) &&
          (objective.compatibleAllegiances === 'ANY' || objective.compatibleAllegiances.includes(allegiance)) &&
          isObjectiveFeasibleForSeat(objective.condition, seatIndex, playerCount, totalRounds),
      );

      if (compatible.length === 0) {
        throw new ContentPoolExhaustedError(
          `Aucun objectif secret compatible et realisable restant pour l'allegeance ${allegiance} (siege ${seatIndex})`,
        );
      }

      let candidates = compatible;

      if (easyUsed >= maxEasy) {
        const nonEasy = candidates.filter((o) => o.difficulty !== 'EASY');
        if (nonEasy.length > 0) candidates = nonEasy;
      }

      const remainingAfterThis = playerIds.length - index - 1;
      const mustGuaranteeDifficulty = playerIds.length >= 4 && mediumOrHardUsed === 0 && remainingAfterThis === 0;
      if (mustGuaranteeDifficulty) {
        const nonEasy = candidates.filter((o) => o.difficulty !== 'EASY');
        if (nonEasy.length > 0) candidates = nonEasy;
      }

      const chosen = shuffle(candidates, rng)[0];
      usedObjectiveIds.add(chosen.id);
      if (chosen.difficulty === 'EASY') easyUsed += 1;
      else mediumOrHardUsed += 1;

      assigned.set(playerId, chosen.id);
    });

    return assigned;
  }
}
