import { DEFAULT_CONFIG } from './config/gameConfig';
import { CrisisCard } from './types';
import { ElectionAnalyzer, PartyGenerationFailedError, PartyGenerator, SolvabilityChecker } from './balance';

function eightPlayers() {
  return Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, displayName: `Joueur ${i + 1}` }));
}

function demonstrateThePreviousBug(): void {
  console.log('=== 1. Le bug que le systeme est concu pour empecher ===');
  console.log('Avant ce systeme, totalRounds valait 7 par defaut, quel que soit le nombre de joueurs.');
  const issues = ElectionAnalyzer.checkRegentCoverage({ ...DEFAULT_CONFIG, totalRounds: 7 }, 8);
  console.log('A 8 joueurs et 7 manches :', issues);
  console.log('-> au moins un siege ne devient jamais Regent : si ce siege est le Pretendant, la Couronne est mathematiquement hors d\'atteinte.\n');
}

function demonstrateGeneratorFixesIt(): void {
  console.log('=== 2. PartyGenerator corrige automatiquement le cas a 8 joueurs ===');
  const { engine, report } = PartyGenerator.generate({ players: eightPlayers(), rngSeed: 7 });
  console.log('totalRounds retenu :', engine.config.totalRounds, '(force a >= nombre de joueurs)');
  console.log('Essais necessaires :', report.attemptsUsed, '| graine retenue :', report.seedUsed);
  console.log('Indice d\'electabilite du Roi :', report.electability.electabilityIndex.toFixed(2), '(bornes attendues: 1.3 - 3.0)');
  console.log('Indices de puissance des roles :', report.rolePower.map((r) => `${r.allegiance}:${r.powerIndex}`).join(', '));
  console.log('Solvabilite : effondrement evitable =', report.solvability.canAvoidCollapse, '| survie totale possible =', report.solvability.canAchieveFullSurvival);
  console.log('Marge la plus faible par ressource :', report.solvability.worstResourceMargin);
  console.log('Avertissements non bloquants :', report.issues.filter((i) => i.severity === 'WARNING').map((i) => i.code));
  console.log();
}

function demonstrateUnsolvableEconomyIsCaught(): void {
  console.log("=== 3. Une economie structurellement condamnee est detectee, jamais servie aux joueurs ===");
  const poisonedDeck: CrisisCard[] = [
    {
      id: 'poison-1', code: 'POISON_1', title: 'Ruine 1', description: 'Test',
      options: [
        { id: 'a', label: 'A', effects: { treasury: -3 } },
        { id: 'b', label: 'B', effects: { treasury: -3, army: 1 } },
      ],
    },
    {
      id: 'poison-2', code: 'POISON_2', title: 'Ruine 2', description: 'Test',
      options: [
        { id: 'a', label: 'A', effects: { treasury: -3 } },
        { id: 'b', label: 'B', effects: { treasury: -3, stability: 1 } },
      ],
    },
    {
      id: 'poison-3', code: 'POISON_3', title: 'Ruine 3', description: 'Test',
      options: [
        { id: 'a', label: 'A', effects: { treasury: -2 } },
        { id: 'b', label: 'B', effects: { treasury: -2, faith: 1 } },
      ],
    },
  ];

  const directCheck = SolvabilityChecker.analyze(poisonedDeck, { ...DEFAULT_CONFIG, totalRounds: 3 });
  console.log('Verification directe du paquet empoisonne :', directCheck.issues.map((i) => i.code));

  try {
    PartyGenerator.generate({
      players: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
        { id: 'c', displayName: 'C' },
      ],
      config: { totalRounds: 3 },
      crisisPool: poisonedDeck,
      rngSeed: 1,
    });
    console.log('ECHEC: le generateur aurait du refuser ce paquet');
  } catch (err) {
    if (err instanceof PartyGenerationFailedError) {
      console.log('OK: PartyGenerator refuse de livrer cette partie ->', err.message);
      console.log('Derniers problemes bloquants observes :', err.lastReport.issues.filter((i) => i.severity === 'BLOCKING').map((i) => i.code));
    } else {
      throw err;
    }
  }
}

demonstrateThePreviousBug();
demonstrateGeneratorFixesIt();
demonstrateUnsolvableEconomyIsCaught();
