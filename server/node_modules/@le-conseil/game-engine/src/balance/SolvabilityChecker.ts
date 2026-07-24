import { ResourceManager } from '../engine/ResourceManager';
import { CrisisCard, GameConfig, ResourceKey, ResourceState } from '../types';
import { BALANCE_COEFFICIENTS } from './coefficients';
import { BalanceIssue, SolvabilityReport } from './types';

const ALL_RESOURCES = Object.values(ResourceKey);

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  [ResourceKey.TREASURY]: 'economie (Tresor)',
  [ResourceKey.ARMY]: 'guerre (Armee)',
  [ResourceKey.STABILITY]: 'stabilite',
  [ResourceKey.FAITH]: 'foi',
};

interface PathResult {
  path: string[];
  finalResources: ResourceState;
  fullSurvival: boolean;
}

/**
 * Verifie, par recherche exhaustive (DFS + memoisation) sur le paquet de
 * crises reellement tire pour la partie, qu'il existe au moins une
 * sequence de choix qui evite l'effondrement du royaume. La branche est
 * volontairement petite (2-3 options x totalRounds manches, soit quelques
 * milliers de noeuds au pire) : une recherche exhaustive est donc rapide
 * et donne une garantie *certaine*, pas une estimation statistique.
 *
 * Le controle est fait a trois niveaux :
 * - par ressource isolee (le Tresor seul peut-il etre sauve, en ignorant
 *   les autres jauges ?) -> diagnostique precisement une economie ou une
 *   guerre structurellement perdue d'avance ;
 * - conjoint (les 4 ressources simultanement) -> une partie peut echouer
 *   ici alors que chaque ressource est individuellement sauvable, parce
 *   que les options les mettent en concurrence (ex: renforcer l'armee
 *   coute toujours le tresor). C'est un defaut d'equilibrage different,
 *   signale a part.
 */
export class SolvabilityChecker {
  static analyze(deck: CrisisCard[], config: GameConfig): { issues: BalanceIssue[]; report: SolvabilityReport } {
    const issues: BalanceIssue[] = [];

    const perResourceResult = new Map<ResourceKey, PathResult | null>();
    for (const resource of ALL_RESOURCES) {
      perResourceResult.set(resource, SolvabilityChecker.findPath(deck, config, [resource]));
    }

    const treasuryOk = perResourceResult.get(ResourceKey.TREASURY) !== null;
    if (!treasuryOk) {
      issues.push({
        code: 'ECONOMY_UNRECOVERABLE',
        severity: 'BLOCKING',
        message:
          "Aucune sequence de choix ne peut empecher le Tresor de s'effondrer : l'economie de cette partie est perdue d'avance, independamment des decisions des joueurs",
      });
    }

    const armyOk = perResourceResult.get(ResourceKey.ARMY) !== null;
    if (!armyOk) {
      issues.push({
        code: 'WAR_UNWINNABLE',
        severity: 'BLOCKING',
        message:
          "Aucune sequence de choix ne peut empecher l'Armee de s'effondrer : la guerre de cette partie est perdue d'avance, independamment des decisions des joueurs",
      });
    }

    for (const resource of [ResourceKey.STABILITY, ResourceKey.FAITH]) {
      if (perResourceResult.get(resource) === null) {
        issues.push({
          code: 'ECONOMY_UNRECOVERABLE',
          severity: 'BLOCKING',
          message: `Aucune sequence de choix ne peut empecher ${RESOURCE_LABELS[resource]} de s'effondrer`,
          details: { resource },
        });
      }
    }

    const jointResult = SolvabilityChecker.findPath(deck, config, ALL_RESOURCES);
    const allIndividuallySolvable = ALL_RESOURCES.every((r) => perResourceResult.get(r) !== null);

    if (!jointResult && allIndividuallySolvable) {
      issues.push({
        code: 'CROSS_RESOURCE_CONFLICT',
        severity: 'BLOCKING',
        message:
          'Chaque ressource est individuellement sauvable, mais aucune sequence ne les sauve toutes en meme temps : les options mettent systematiquement les jauges en concurrence directe (ex: gagner de l\'Armee coute toujours trop cher en Tresor)',
      });
    }

    const worstResourceMargin: Record<string, number> = {};
    const referencePath = jointResult ?? SolvabilityChecker.findPath(deck, config, ALL_RESOURCES, true);
    if (referencePath) {
      const margins = SolvabilityChecker.computeMargins(deck, config, referencePath.path);
      Object.assign(worstResourceMargin, margins);
    }

    return {
      issues,
      report: {
        canAvoidCollapse: jointResult !== null,
        canAchieveFullSurvival: jointResult?.fullSurvival ?? false,
        examplePath: jointResult?.path ?? referencePath?.path,
        worstResourceMargin,
      },
    };
  }

  /**
   * Recherche en profondeur, avec memoisation des etats "sans issue", du
   * meilleur chemin possible. `bestEffort` desactive l'elagage strict pour
   * retourner un chemin meme s'il finit par s'effondrer (utile uniquement
   * pour illustrer la marge la moins pire quand aucune solution parfaite
   * n'existe).
   */
  private static findPath(
    deck: CrisisCard[],
    config: GameConfig,
    watchedResources: ResourceKey[],
    bestEffort = false,
  ): PathResult | null {
    const failedStates = new Set<string>();

    const stateKey = (index: number, res: ResourceState) =>
      `${index}:${ALL_RESOURCES.map((r) => res[r]).join(',')}`;

    const isBad = (res: ResourceState) => watchedResources.some((r) => res[r] <= config.collapseThreshold);

    function dfs(index: number, res: ResourceState, path: string[]): PathResult | null {
      if (index === deck.length) {
        return {
          path: [...path],
          finalResources: res,
          fullSurvival: ResourceManager.meetsSurvivalThreshold(res, config.survivalThreshold),
        };
      }

      const key = stateKey(index, res);
      if (!bestEffort && failedStates.has(key)) return null;

      const card = deck[index];
      let fallback: PathResult | null = null;

      for (const option of card.options) {
        const next = ResourceManager.applyDelta(res, option.effects, config.resourceBounds);
        const nextIsBad = isBad(next);
        if (nextIsBad && !bestEffort) continue;

        const result = dfs(index + 1, next, [...path, `${card.code}:${option.id}`]);
        if (result && !nextIsBad) return result;
        if (bestEffort && result && !fallback) fallback = result;
      }

      if (!bestEffort) failedStates.add(key);
      return fallback;
    }

    return dfs(0, config.startingResources, []);
  }

  private static computeMargins(deck: CrisisCard[], config: GameConfig, path: string[]): Record<string, number> {
    const worst: Record<string, number> = {};
    for (const resource of ALL_RESOURCES) worst[resource] = config.startingResources[resource];

    let resources = { ...config.startingResources };
    path.forEach((step, index) => {
      const [, optionId] = step.split(':');
      const option = deck[index].options.find((o) => o.id === optionId)!;
      resources = ResourceManager.applyDelta(resources, option.effects, config.resourceBounds);
      for (const resource of ALL_RESOURCES) {
        worst[resource] = Math.min(worst[resource], resources[resource]);
      }
    });

    return worst;
  }

  /** Nombre de cartes offrant une vraie option de "sauvetage" pour une ressource donnee. */
  static countRescueCards(deck: CrisisCard[], resource: ResourceKey): number {
    return deck.filter((card) =>
      card.options.some((o) => (o.effects[resource] ?? 0) >= BALANCE_COEFFICIENTS.rescueDeltaThreshold),
    ).length;
  }
}
