import {
  Allegiance,
  GameConfig,
  GameResult,
  PlayerFinalRole,
  PlayerObjectiveResult,
  PlayerRuntime,
  PlayerScore,
  ResourceState,
  SecretObjective,
  VictoryRecord,
  VictoryType,
} from '../types';
import { ObjectiveEvaluator } from './ObjectiveEvaluator';
import { ResourceManager } from './ResourceManager';
import { claimantTokensRequired } from './schedule';

export interface VictoryEvaluationParams {
  config: GameConfig;
  /** Nombre de manches effectivement jouees/prevues (peut differer de config.totalRounds, cf. effectiveTotalRounds). */
  totalRounds: number;
  resources: ResourceState;
  collapsed: boolean;
  collapsedAtRound?: number;
  players: PlayerRuntime[];
  objectivePoolById: Map<string, SecretObjective>;
  rolePoolById: Map<string, { name: string }>;
}

export class VictoryEvaluator {
  /**
   * Les conditions de victoire sont evaluees independamment les unes des
   * autres (plusieurs camps/joueurs peuvent gagner simultanement) :
   * - KINGDOM_SURVIVES : toutes les ressources au-dessus du seuil de survie
   *   et aucun effondrement n'a eu lieu.
   * - FOREIGN_AGENT_COLLAPSE : le royaume s'est effondre alors qu'au moins
   *   un Agent etranger n'avait pas ete demasque.
   * - CLAIMANT_CROWNED : le royaume n'est pas tombe ET le Pretendant a
   *   accumule au moins claimantTokensRequired(siege) jetons de soutien.
   *   Le seuil est proportionnel aux regences reelles de son siege : l'ancien
   *   seuil global (ceil(totalRounds * ratio)) etait mathematiquement
   *   inatteignable quel que soit le nombre de joueurs.
   * - les objectifs personnels sont evalues pour tous les joueurs, quel que
   *   soit le sort du royaume.
   */
  static evaluate(params: VictoryEvaluationParams): GameResult {
    const { config, totalRounds, resources, collapsed, collapsedAtRound, players, objectivePoolById, rolePoolById } =
      params;

    const victories: VictoryRecord[] = [];
    const kingdomSurvived = !collapsed && ResourceManager.meetsSurvivalThreshold(resources, config.survivalThreshold);

    if (kingdomSurvived) {
      victories.push({
        type: VictoryType.KINGDOM_SURVIVES,
        playerIds: players.filter((p) => p.allegiance === Allegiance.LOYALIST).map((p) => p.id),
        reason: 'Le royaume a traverse la succession sans sombrer.',
      });
    }

    const foreignAgents = players.filter((p) => p.allegiance === Allegiance.FOREIGN_AGENT);
    if (collapsed && foreignAgents.length > 0) {
      const unrevealed = foreignAgents.filter((p) => !p.revealed);
      if (unrevealed.length > 0) {
        victories.push({
          type: VictoryType.FOREIGN_AGENT_COLLAPSE,
          playerIds: unrevealed.map((p) => p.id),
          reason: "Le royaume s'est effondre sans que l'agent infiltre ne soit demasque.",
        });
      }
    } else if (collapsed && foreignAgents.length === 0) {
      victories.push({
        type: VictoryType.KINGDOM_COLLAPSED_NO_AGENT,
        playerIds: [],
        reason: "Le royaume s'est effondre ; personne ne remporte la couronne.",
      });
    }

    const claimants = players.filter((p) => p.allegiance === Allegiance.CLAIMANT);
    for (const claimant of claimants) {
      const required = claimantTokensRequired(
        claimant.seatIndex,
        players.length,
        totalRounds,
        config.claimantSupportThresholdRatio,
      );
      if (!collapsed && claimant.supportTokens >= required) {
        victories.push({
          type: VictoryType.CLAIMANT_CROWNED,
          playerIds: [claimant.id],
          reason: `${claimant.supportTokens} jeton(s) de soutien accumules sur un seuil requis de ${required}.`,
        });
      }
    }

    const objectiveResults: PlayerObjectiveResult[] = players.map((player) => {
      const objective = objectivePoolById.get(player.secretObjectiveId)!;
      const achieved = ObjectiveEvaluator.evaluate(objective, {
        finalResources: resources,
        kingdomCollapsed: collapsed,
        player,
      });
      return { playerId: player.id, objectiveId: objective.id, achieved };
    });

    const finalRoles: PlayerFinalRole[] = players.map((p) => ({
      playerId: p.id,
      allegiance: p.allegiance,
      roleId: p.roleId,
      roleName: rolePoolById.get(p.roleId)?.name ?? p.roleId,
    }));

    const scoreboard = VictoryEvaluator.buildScoreboard(players, victories, objectiveResults, config);
    const maxTotal = scoreboard.reduce((max, s) => Math.max(max, s.total), 0);
    const winnerPlayerIds = maxTotal > 0 ? scoreboard.filter((s) => s.total === maxTotal).map((s) => s.playerId) : [];

    return { kingdomSurvived, collapsedAtRound, victories, objectiveResults, finalRoles, scoreboard, winnerPlayerIds };
  }

  /**
   * Traduit les victoires de camp et les objectifs personnels en un classement
   * chiffre unique — la source de verite du "qui gagne". Un joueur marque les
   * points de camp si son identifiant figure dans une victoire, plus les points
   * d'objectif s'il a reussi sa mission. Les ex-aequo partagent le meme rang ;
   * le(s) meilleur(s) score(s) strictement positif(s) sont les gagnants (si
   * personne ne marque, la partie n'a pas de vainqueur).
   */
  private static buildScoreboard(
    players: PlayerRuntime[],
    victories: VictoryRecord[],
    objectiveResults: PlayerObjectiveResult[],
    config: GameConfig,
  ): PlayerScore[] {
    const winnersOfCamp = new Set<string>();
    for (const victory of victories) {
      for (const id of victory.playerIds) winnersOfCamp.add(id);
    }
    const achievedObjective = new Set(objectiveResults.filter((o) => o.achieved).map((o) => o.playerId));

    const rows = players.map((p) => {
      const campPoints = winnersOfCamp.has(p.id) ? config.scoring.campVictory : 0;
      const objectivePoints = achievedObjective.has(p.id) ? config.scoring.objective : 0;
      return { playerId: p.id, campPoints, objectivePoints, total: campPoints + objectivePoints, rank: 0, isWinner: false };
    });

    // Tri decroissant par score ; rang standard (ex-aequo memes rang, sauts ensuite).
    rows.sort((a, b) => b.total - a.total);
    const maxTotal = rows.length > 0 ? rows[0].total : 0;
    rows.forEach((row, index) => {
      row.rank = index > 0 && row.total === rows[index - 1].total ? rows[index - 1].rank : index + 1;
      row.isWinner = maxTotal > 0 && row.total === maxTotal;
    });

    return rows;
  }
}
