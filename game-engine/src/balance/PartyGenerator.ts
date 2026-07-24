import { DEFAULT_CONFIG } from '../config/gameConfig';
import { GameEngine } from '../engine/GameEngine';
import { GameConfig, ResourceKey } from '../types';
import { BALANCE_COEFFICIENTS } from './coefficients';
import { ElectionAnalyzer } from './ElectionAnalyzer';
import { PartyGenerationFailedError } from './errors';
import { RoleBalanceAnalyzer } from './RoleBalanceAnalyzer';
import { SolvabilityChecker } from './SolvabilityChecker';
import { BalanceIssue, BalanceReport, PartyGenerationRequest } from './types';

const ALL_RESOURCES = Object.values(ResourceKey);

/**
 * Genere une partie du Conseil garantie exempte des quatre defauts
 * d'equilibrage critiques :
 *
 * 1. "Assassin trop puissant"      -> RoleBalanceAnalyzer + PowerAllocator
 * 2. "Roi impossible a elire"      -> ElectionAnalyzer (+ totalRounds >= joueurs)
 * 3. "Economie impossible a sauver"-> SolvabilityChecker (ressource Tresor)
 * 4. "Guerre impossible a gagner"  -> SolvabilityChecker (ressource Armee)
 *
 * Methode : "generer-et-tester". Plutot que de prouver mathematiquement
 * qu'une configuration est toujours equilibree (tres difficile des que le
 * contenu est personnalisable), on construit une partie candidate
 * complete via GameEngine.create() puis on l'audite avec les analyseurs
 * ci-dessus. Une candidate qui echoue est jetee et une nouvelle graine est
 * essayee. L'espace de recherche est petit (quelques joueurs, quelques
 * manches, 2-3 options par carte) donc la convergence est quasi-immediate
 * en pratique, meme si la garantie formelle est probabiliste ("jusqu'a N
 * essais") plutot que deterministe.
 */
export class PartyGenerator {
  static generate(request: PartyGenerationRequest): { engine: GameEngine; report: BalanceReport } {
    const playerCount = request.players.length;

    // Regle dure : sans au moins un mandat de Regent par joueur, une
    // couronne peut devenir mathematiquement hors d'atteinte selon le
    // siege tire. Aucune graine ne peut compenser une regle structurelle.
    const minRounds = playerCount * BALANCE_COEFFICIENTS.minRoundsPerPlayer;
    const baseConfig: GameConfig = {
      ...DEFAULT_CONFIG,
      ...request.config,
    };
    baseConfig.totalRounds = Math.max(baseConfig.totalRounds, minRounds);

    // Le seuil de couronnement du Pretendant est desormais calcule PAR SIEGE
    // par le moteur lui-meme (engine/schedule.ts : proportionnel aux regences
    // reelles du siege tire). Le generateur n'a donc plus a recalibrer le
    // ratio ici — il verifie seulement que la partie candidate reste
    // gagnable via ElectionAnalyzer.
    const structuralIssues = ElectionAnalyzer.checkRegentCoverage(baseConfig, playerCount);
    if (structuralIssues.length > 0) {
      // Ne devrait jamais arriver puisqu'on vient de forcer totalRounds >= minRounds,
      // conserve comme filet de securite si la config est modifiee plus tard.
      throw new PartyGenerationFailedError(
        'Configuration structurellement invalide (couverture de Regence insuffisante)',
        PartyGenerator.emptyReport(structuralIssues),
      );
    }

    const baseSeed = request.rngSeed ?? Date.now();

    let lastReport: BalanceReport | null = null;

    for (let attempt = 1; attempt <= BALANCE_COEFFICIENTS.maxGenerationAttempts; attempt++) {
      const seedUsed = baseSeed + attempt * 104_729; // grand nombre premier : evite les correlations entre graines successives

      const engine = GameEngine.create({
        players: request.players,
        config: baseConfig,
        crisisDeck: request.crisisPool,
        objectivePool: request.objectivePool,
        rngSeed: seedUsed,
      });

      const playerIds = request.players.map((p) => p.id);
      const issues: BalanceIssue[] = [];

      const roleAnalysis = RoleBalanceAnalyzer.analyze(engine, playerIds);
      issues.push(...roleAnalysis.issues);

      const electionAnalysis = ElectionAnalyzer.analyze(engine, playerIds);
      issues.push(...electionAnalysis.issues);

      const upcomingCrises = engine.peekUpcomingCrises();
      const solvability = SolvabilityChecker.analyze(upcomingCrises, engine.config);
      issues.push(...solvability.issues);

      for (const resource of ALL_RESOURCES) {
        const rescueCount = SolvabilityChecker.countRescueCards(upcomingCrises, resource);
        const minRescueCount = Math.ceil(upcomingCrises.length * BALANCE_COEFFICIENTS.minRescueCardRatio);
        if (rescueCount < minRescueCount) {
          issues.push({
            code: 'INSUFFICIENT_RESCUE_CARDS',
            severity: 'WARNING',
            message: `Seulement ${rescueCount} carte(s) de secours pour ${resource} sur ${upcomingCrises.length} manches (recommande: ${minRescueCount})`,
            details: { resource, rescueCount, minRescueCount },
          });
        }
      }

      const report: BalanceReport = {
        passed: issues.every((i) => i.severity !== 'BLOCKING'),
        issues,
        rolePower: roleAnalysis.rolePower,
        electability: electionAnalysis.report,
        solvability: solvability.report,
        attemptsUsed: attempt,
        seedUsed,
      };
      lastReport = report;

      if (report.passed) {
        return { engine, report };
      }
    }

    throw new PartyGenerationFailedError(
      `Aucune configuration equilibree trouvee apres ${BALANCE_COEFFICIENTS.maxGenerationAttempts} essais. ` +
        'Le contenu fourni (paquet de crises / pool d\'objectifs personnalise) est probablement trop restreint ou trop dur.',
      lastReport!,
    );
  }

  private static emptyReport(issues: BalanceIssue[]): BalanceReport {
    return {
      passed: false,
      issues,
      rolePower: [],
      electability: {
        claimantPlayerId: '',
        expectedRegentTurns: 0,
        requiredSupportThreshold: 0,
        maxAchievableSupport: 0,
        electabilityIndex: 0,
      },
      solvability: { canAvoidCollapse: false, canAchieveFullSurvival: false, worstResourceMargin: {} },
      attemptsUsed: 0,
      seedUsed: 0,
    };
  }
}
