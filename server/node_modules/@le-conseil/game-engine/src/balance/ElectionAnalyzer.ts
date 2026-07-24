import { GameEngine } from '../engine/GameEngine';
import { Allegiance, GameConfig } from '../types';
import { BALANCE_COEFFICIENTS } from './coefficients';
import { BalanceIssue, ElectabilityReport } from './types';

interface ClaimantAnalysis {
  playerId: string;
  regentRounds: number[];
  required: number;
  maxAchievable: number;
  index: number;
}

/**
 * Verifie que le titre de Roi (le Pretendant) est a la fois atteignable et
 * non-trivial. La rotation du Regent etant deterministe une fois les
 * sieges tires (round r -> seatOrder[(r-1) % n]), le nombre de mandats de
 * chaque joueur — et donc le soutien maximal theorique du Pretendant — est
 * calculable exactement, sans simuler la partie.
 */
export class ElectionAnalyzer {
  /**
   * Verification structurelle, independante de toute graine : si le nombre
   * de manches est inferieur au nombre de joueurs, au moins un siege
   * n'obtient jamais la Regence. C'est une regle dure, jamais assouplie.
   */
  static checkRegentCoverage(config: GameConfig, playerCount: number): BalanceIssue[] {
    if (config.totalRounds < playerCount) {
      return [
        {
          code: 'MISSING_REGENT_SLOT',
          severity: 'BLOCKING',
          message: `${config.totalRounds} manches pour ${playerCount} joueurs : au moins un siege n'accede jamais a la Regence (minimum requis: ${BALANCE_COEFFICIENTS.minRoundsPerPlayer} mandat/joueur)`,
          details: { totalRounds: config.totalRounds, playerCount },
        },
      ];
    }
    return [];
  }

  static analyze(engine: GameEngine, playerIds: string[]): { issues: BalanceIssue[]; report: ElectabilityReport } {
    const publicState = engine.getPublicState();
    const seatOrder = [...publicState.players].sort((a, b) => a.seatIndex - b.seatIndex).map((p) => p.id);
    const totalRounds = publicState.totalRounds;
    const n = seatOrder.length;

    const regentTurnsByPlayer = new Map<string, number>();
    const roundsByPlayer = new Map<string, number[]>();
    for (let round = 1; round <= totalRounds; round++) {
      const regentId = seatOrder[(round - 1) % n];
      regentTurnsByPlayer.set(regentId, (regentTurnsByPlayer.get(regentId) ?? 0) + 1);
      const rounds = roundsByPlayer.get(regentId) ?? [];
      rounds.push(round);
      roundsByPlayer.set(regentId, rounds);
    }

    const claimants = playerIds
      .map((id) => ({ id, priv: engine.getPrivateStateFor(id) }))
      .filter((p) => p.priv.allegiance === Allegiance.CLAIMANT);

    const issues: BalanceIssue[] = [];

    if (claimants.length === 0) {
      // La table de repartition actuelle garantit toujours un Pretendant,
      // mais on reste defensif face a un contenu personnalise.
      return {
        issues,
        report: {
          claimantPlayerId: '',
          expectedRegentTurns: 0,
          requiredSupportThreshold: 0,
          maxAchievableSupport: 0,
          electabilityIndex: 1,
        },
      };
    }

    const upcomingCrises = engine.peekUpcomingCrises();

    // Le seuil requis est desormais PAR SIEGE (engine/schedule.ts) et expose
    // dans l'etat prive du joueur — on lit donc la meme verite que le moteur
    // au lieu de la recalculer avec une formule parallele.
    const analyses: ClaimantAnalysis[] = claimants.map((claimant) => {
      const regentRounds = roundsByPlayer.get(claimant.id) ?? [];
      let maxAchievable = 0;
      for (const round of regentRounds) {
        const card = upcomingCrises[round - 1];
        const bestSupportGain = Math.max(0, ...card.options.map((o) => o.supportGain ?? 0));
        maxAchievable += bestSupportGain;
      }
      const required = claimant.priv.claimantTokensRequired;
      return {
        playerId: claimant.id,
        regentRounds,
        required,
        maxAchievable,
        index: required > 0 ? maxAchievable / required : Infinity,
      };
    });

    for (const a of analyses) {
      // Avec un seul mandat de Regence possible, le soutien accumulable est
      // un entier binaire (0 ou 1 carte a soutien) : aucune marge de securite
      // fractionnaire (x1.3) n'est jamais atteignable par construction. On
      // distingue donc "impossible" (index < 1) de "sans marge" (atteignable
      // mais joue sur une seule carte).
      const hasMarginRoom = a.regentRounds.length >= 2;

      if (a.regentRounds.length < BALANCE_COEFFICIENTS.minRoundsPerPlayer) {
        issues.push({
          code: 'MISSING_REGENT_SLOT',
          severity: 'BLOCKING',
          message: `Le Pretendant (${a.playerId}) n'obtient aucun mandat de Regent sur cette repartition des sieges`,
          details: { playerId: a.playerId },
        });
      } else if (a.index < 1) {
        issues.push({
          code: 'KING_UNREACHABLE',
          severity: 'BLOCKING',
          message: `Le Pretendant ${a.playerId} ne peut atteindre que ${a.maxAchievable} soutien(s) au mieux, sous le seuil requis ${a.required} (indice ${a.index.toFixed(2)}) : la Couronne est mathematiquement hors d'atteinte sur cette partie`,
          details: { playerId: a.playerId, maxAchievableSupport: a.maxAchievable, requiredSupportThreshold: a.required, electabilityIndex: a.index },
        });
      } else if (a.index < BALANCE_COEFFICIENTS.electabilityIndex.min) {
        issues.push({
          code: 'KING_UNREACHABLE',
          severity: hasMarginRoom ? 'BLOCKING' : 'WARNING',
          message: hasMarginRoom
            ? `Le Pretendant ${a.playerId} est sous la marge de securite (indice ${a.index.toFixed(2)}, minimum ${BALANCE_COEFFICIENTS.electabilityIndex.min}) : sa victoire depend d'un enchainement trop favorable pour etre fiable`
            : `Le Pretendant ${a.playerId} n'a qu'un seul mandat de Regence possible : sa victoire depend entierement de la carte tiree ce tour-la (indice ${a.index.toFixed(2)}) — atteignable mais a variance elevee, inherent a ce nombre de joueurs`,
          details: { playerId: a.playerId, maxAchievableSupport: a.maxAchievable, requiredSupportThreshold: a.required, electabilityIndex: a.index, hasMarginRoom },
        });
      } else if (a.index > BALANCE_COEFFICIENTS.electabilityIndex.max) {
        issues.push({
          code: 'KING_TOO_EASY',
          severity: 'WARNING',
          message: `Le Pretendant ${a.playerId} peut largement depasser le seuil requis (indice ${a.index.toFixed(2)}, maximum recommande ${BALANCE_COEFFICIENTS.electabilityIndex.max}) — la couronne risque d'etre acquise sans opposition reelle`,
          details: { playerId: a.playerId, maxAchievableSupport: a.maxAchievable, requiredSupportThreshold: a.required, electabilityIndex: a.index },
        });
      }
    }

    // Le rapport agrege reflete le Pretendant le plus defavorise.
    const worst = analyses.reduce((min, a) => (a.index < min.index ? a : min), analyses[0]);
    return {
      issues,
      report: {
        claimantPlayerId: worst.playerId,
        expectedRegentTurns: worst.regentRounds.length,
        requiredSupportThreshold: worst.required,
        maxAchievableSupport: worst.maxAchievable,
        electabilityIndex: worst.index,
      },
    };
  }
}
