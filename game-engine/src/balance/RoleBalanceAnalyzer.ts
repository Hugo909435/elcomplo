import { POWER_WEIGHT } from '../config/powers';
import { GameEngine } from '../engine/GameEngine';
import { Allegiance } from '../types';
import { BALANCE_COEFFICIENTS } from './coefficients';
import { BalanceIssue, RolePowerReport } from './types';

/**
 * Detecte un role hostile ("Assassin" / Agent etranger) trop puissant en
 * comparant son "Role Power Index" (RPI) — somme ponderee de ses pouvoirs
 * restants — a la moyenne des Loyalistes de la meme partie.
 *
 * C'est une mesure relative, pas absolue : un pouvoir fort est acceptable
 * si le reste de la table dispose d'une contrepartie comparable. C'est le
 * ratio, pas la valeur brute, qui determine l'equilibre.
 */
export class RoleBalanceAnalyzer {
  static analyze(engine: GameEngine, playerIds: string[]): { issues: BalanceIssue[]; rolePower: RolePowerReport[] } {
    const issues: BalanceIssue[] = [];
    const rolePower: RolePowerReport[] = playerIds.map((playerId) => {
      const priv = engine.getPrivateStateFor(playerId);
      const powerIndex = priv.powers.reduce((sum, p) => sum + POWER_WEIGHT[p.type] * p.usesRemaining, 0);
      return { playerId, allegiance: priv.allegiance, powerIndex };
    });

    const loyalistScores = rolePower.filter((r) => r.allegiance === Allegiance.LOYALIST).map((r) => r.powerIndex);
    const avgLoyalist = loyalistScores.length
      ? loyalistScores.reduce((a, b) => a + b, 0) / loyalistScores.length
      : 0;

    const hostiles = rolePower.filter((r) => r.allegiance === Allegiance.FOREIGN_AGENT);
    for (const hostile of hostiles) {
      const ratio = avgLoyalist > 0 ? hostile.powerIndex / avgLoyalist : hostile.powerIndex > 0 ? Infinity : 1;

      if (ratio > BALANCE_COEFFICIENTS.assassinPowerRatio.max) {
        issues.push({
          code: 'ASSASSIN_TOO_STRONG',
          severity: 'BLOCKING',
          message: `L'Agent etranger ${hostile.playerId} a un indice de puissance ${hostile.powerIndex} contre une moyenne Loyaliste de ${avgLoyalist.toFixed(2)} (ratio ${ratio === Infinity ? '∞' : ratio.toFixed(2)}, max autorise ${BALANCE_COEFFICIENTS.assassinPowerRatio.max})`,
          details: { playerId: hostile.playerId, ratio, avgLoyalist },
        });
      } else if (ratio < BALANCE_COEFFICIENTS.assassinPowerRatio.min) {
        issues.push({
          code: 'ASSASSIN_TOO_WEAK',
          severity: 'WARNING',
          message: `L'Agent etranger ${hostile.playerId} est en retrait de puissance (ratio ${ratio.toFixed(2)}, min recommande ${BALANCE_COEFFICIENTS.assassinPowerRatio.min}) — role peu menacant`,
          details: { playerId: hostile.playerId, ratio, avgLoyalist },
        });
      }

      const priv = engine.getPrivateStateFor(hostile.playerId);
      const highWeightCount = priv.powers.filter((p) => POWER_WEIGHT[p.type] >= 3).length;
      if (highWeightCount > BALANCE_COEFFICIENTS.maxHighWeightPowersPerHostile) {
        issues.push({
          code: 'HOSTILE_POWER_STACKING',
          severity: 'BLOCKING',
          message: `${hostile.playerId} cumule ${highWeightCount} pouvoirs de poids eleve (max ${BALANCE_COEFFICIENTS.maxHighWeightPowersPerHostile})`,
          details: { playerId: hostile.playerId, highWeightCount },
        });
      }
    }

    return { issues, rolePower };
  }
}
