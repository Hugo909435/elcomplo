import { CrisisOption } from '../types';
import { RandomFn } from './rng';

export interface VoteResolutionParams {
  options: CrisisOption[];
  /** playerId -> optionId. Les entrees absentes valent abstention. */
  votes: Record<string, string>;
  allPlayerIds: string[];
  regentPlayerId: string;
  /** Vrai si le Regent a active BOOST_REGENT ce tour (son vote compte double). */
  regentBoosted: boolean;
  /** Vrai si la resolution a ete declenchee par expiration du timer plutot que par tous les votes recus. */
  forced: boolean;
  /** Generateur aleatoire de la partie : departage les cas sans vainqueur clair sans biais d'ordre exploitable. */
  rng: RandomFn;
}

export interface VoteResolution {
  chosenOptionId: string;
  tally: Record<string, number>;
  abstentions: string[];
  wasTie: boolean;
  wasForcedByTimeout: boolean;
  /** Vrai uniquement si le vote du Regent a effectivement departage l'egalite. */
  wasTieBrokenByRegent: boolean;
  /** Vrai si l'option a ete tiree au sort (zero vote exprime, ou egalite sans vote du Regent parmi les leaders). */
  wasChosenByLot: boolean;
}

export class VoteResolver {
  /**
   * Ne bloque jamais la partie : meme si personne n'a vote valablement
   * (deconnexions massives), une option est toujours retenue. Les cas sans
   * vainqueur clair sont tires au sort via le RNG seede de la partie —
   * jamais "la premiere option" : un choix deterministe serait un biais
   * public exploitable par abstention coordonnee.
   */
  static resolve(params: VoteResolutionParams): VoteResolution {
    const { options, votes, allPlayerIds, regentPlayerId, regentBoosted, forced, rng } = params;
    const validOptionIds = new Set(options.map((o) => o.id));

    const tally: Record<string, number> = {};
    for (const option of options) tally[option.id] = 0;

    for (const playerId of allPlayerIds) {
      const optionId = votes[playerId];
      if (!optionId || !validOptionIds.has(optionId)) continue;
      const weight = playerId === regentPlayerId && regentBoosted ? 2 : 1;
      tally[optionId] += weight;
    }

    const abstentions = allPlayerIds.filter((id) => !votes[id] || !validOptionIds.has(votes[id]));

    const maxVotes = Math.max(...Object.values(tally));
    const leaders = Object.entries(tally)
      .filter(([, count]) => count === maxVotes)
      .map(([optionId]) => optionId);

    let chosenOptionId: string;
    let wasTieBrokenByRegent = false;
    let wasChosenByLot = false;
    const wasTie = maxVotes > 0 && leaders.length > 1;

    if (maxVotes === 0) {
      chosenOptionId = options[Math.floor(rng() * options.length)].id;
      wasChosenByLot = true;
    } else if (leaders.length === 1) {
      chosenOptionId = leaders[0];
    } else {
      const regentChoice = votes[regentPlayerId];
      if (regentChoice && leaders.includes(regentChoice)) {
        chosenOptionId = regentChoice;
        wasTieBrokenByRegent = true;
      } else {
        chosenOptionId = leaders[Math.floor(rng() * leaders.length)];
        wasChosenByLot = true;
      }
    }

    return { chosenOptionId, tally, abstentions, wasTie, wasForcedByTimeout: forced, wasTieBrokenByRegent, wasChosenByLot };
  }
}
