import { ConfigurationImbalanceError, ContentPoolExhaustedError } from '../errors';
import { CrisisCard, GameConfig } from '../types';

export const DEFAULT_CRISIS_DECK: CrisisCard[] = [
  {
    id: 'crisis-01',
    code: 'GRENIERS',
    title: 'Les greniers royaux',
    description: "Le peuple reclame l'ouverture des greniers royaux face a la disette.",
    options: [
      { id: 'a', label: 'Ouvrir les greniers', effects: { treasury: -2, stability: 2 } },
      { id: 'b', label: 'Rationner severement', effects: { stability: -2, army: 1 }, supportGain: 1 },
      { id: 'c', label: "Faire appel a l'Eglise", effects: { faith: -1, stability: 1, treasury: 1 } },
    ],
  },
  {
    id: 'crisis-02',
    code: 'FRONTIERE',
    title: 'Incursion a la frontiere',
    description: 'Des troupes etrangeres testent nos defenses.',
    options: [
      { id: 'a', label: "Mobiliser l'armee", effects: { army: 2, treasury: -2 } },
      { id: 'b', label: 'Negocier un tribut', effects: { treasury: -3, stability: 1 }, supportGain: 1 },
      { id: 'c', label: 'Ignorer la menace', effects: { army: -2, stability: -1 } },
    ],
  },
  {
    id: 'crisis-03',
    code: 'HERESIE',
    title: "Proces pour heresie",
    description: 'Un noble accuse un rival de pactiser avec des forces impies.',
    options: [
      { id: 'a', label: 'Ordonner un proces public', effects: { faith: 2, stability: -1 }, supportGain: 1 },
      { id: 'b', label: "Etouffer l'affaire", effects: { faith: -1, treasury: 1 } },
      { id: 'c', label: "Exiler l'accuse", effects: { stability: 1, faith: -1, army: -1 } },
    ],
  },
  {
    id: 'crisis-04',
    code: 'IMPOTS',
    title: "Levee d'impots exceptionnelle",
    description: 'Le Tresor est exsangue ; faut-il taxer les terres nobles ?',
    options: [
      { id: 'a', label: 'Taxer la noblesse', effects: { treasury: 3, stability: -2 } },
      { id: 'b', label: 'Taxer le peuple', effects: { treasury: 2, stability: -1, faith: -1 } },
      { id: 'c', label: 'Emprunter aux marchands etrangers', effects: { treasury: 2, army: -1 } },
    ],
  },
  {
    id: 'crisis-05',
    code: 'PESTE',
    title: 'Epidemie dans la capitale',
    description: 'Une maladie se repand dans les bas-quartiers.',
    options: [
      { id: 'a', label: 'Quarantaine stricte', effects: { stability: -2, faith: 1 } },
      { id: 'b', label: 'Financer les guerisseurs', effects: { treasury: -3, stability: 1 }, supportGain: 1 },
      { id: 'c', label: 'Prier pour le salut du peuple', effects: { faith: 2, stability: -1 } },
    ],
  },
  {
    id: 'crisis-06',
    code: 'MARIAGE',
    title: 'Proposition de mariage etranger',
    description: 'Un royaume voisin propose une alliance par mariage.',
    options: [
      { id: 'a', label: "Accepter l'alliance", effects: { army: 1, treasury: 1, faith: -1 }, supportGain: 1 },
      { id: 'b', label: 'Refuser poliment', effects: { stability: 1, army: -1 } },
      { id: 'c', label: 'Exiger une dot exorbitante', effects: { treasury: 2, stability: -1 } },
    ],
  },
  {
    id: 'crisis-07',
    code: 'MUTINERIE',
    title: 'Murmures de mutinerie',
    description: 'La garde royale gronde, impayee depuis deux mois.',
    options: [
      { id: 'a', label: 'Payer immediatement', effects: { treasury: -3, army: 2 } },
      { id: 'b', label: 'Faire un exemple', effects: { army: -1, stability: -1, faith: 1 } },
      { id: 'c', label: 'Promettre des terres', effects: { army: 1, stability: -1 }, supportGain: 1 },
    ],
  },
  {
    id: 'crisis-08',
    code: 'RELIQUE',
    title: 'La relique perdue',
    description: 'Une relique sacree refait surface, reclamee par plusieurs factions.',
    options: [
      { id: 'a', label: 'La confier au clerge', effects: { faith: 3, treasury: -1 } },
      { id: 'b', label: 'La vendre aux encheres', effects: { treasury: 3, faith: -2 } },
      { id: 'c', label: 'L\'exposer publiquement', effects: { stability: 2, faith: -1 }, supportGain: 1 },
    ],
  },
  {
    id: 'crisis-09',
    code: 'COMPLOT',
    title: 'Rumeurs de complot',
    description: 'Des lettres anonymes evoquent un complot au sein meme du Conseil.',
    options: [
      { id: 'a', label: 'Enquete discrete', effects: { stability: 1, treasury: -1 } },
      { id: 'b', label: 'Accusations publiques', effects: { stability: -2, army: 1 }, supportGain: 1 },
      { id: 'c', label: 'Renforcer la garde du Conseil', effects: { army: 1, treasury: -1 } },
    ],
  },
];

/**
 * Empeche deux categories de "parties impossibles" :
 * 1. un paquet trop petit pour couvrir toutes les manches prevues (on ne
 *    pioche jamais deux fois la meme crise dans une partie) ;
 * 2. une carte dont une option depasse l'impact maximal autorise, ce qui
 *    permettrait d'effondrer une ressource pleine en un seul tour et donc
 *    de trivialiser la victoire de l'Agent etranger.
 */
export function validateCrisisDeck(deck: CrisisCard[], config: GameConfig): void {
  if (deck.length < config.totalRounds) {
    throw new ContentPoolExhaustedError(
      `Le paquet de crises (${deck.length} cartes) est trop petit pour ${config.totalRounds} manches`,
    );
  }

  for (const card of deck) {
    if (card.options.length < 2 || card.options.length > 3) {
      throw new ConfigurationImbalanceError(
        `La crise ${card.code} doit proposer 2 ou 3 options (trouve : ${card.options.length})`,
      );
    }
    for (const option of card.options) {
      for (const [resource, delta] of Object.entries(option.effects)) {
        if (delta !== undefined && Math.abs(delta) > config.maxSingleCrisisImpact) {
          throw new ConfigurationImbalanceError(
            `L'option "${option.label}" de ${card.code} affecte ${resource} de ${delta}, ` +
              `au-dela du maximum autorise (${config.maxSingleCrisisImpact})`,
          );
        }
      }
    }
  }
}
