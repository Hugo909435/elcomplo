import { ResourceKey } from '../../types';
import { EventCategory, EventTemplate, SeverityTier } from '../types';

const S = SeverityTier;

/**
 * Categorie Peuple (bonheur / Stabilite). Contient la chaine "La Grande
 * Peste" (3 templates, 2 etapes) et 9 evenements independants.
 */
export const PEOPLE_TEMPLATES: EventTemplate[] = [
  // ---- Chaine : La Grande Peste ----
  {
    id: 'peo-01',
    category: EventCategory.PEOPLE,
    name: 'Les premieres fievres de {lieu}',
    story: 'Des cas de fievre malgracieuse se multiplient a {lieu}. Les medecins de la cour hesitent sur la marche a suivre.',
    baseConditions: [
      { type: 'RESOURCE_BELOW', resource: ResourceKey.STABILITY, value: 6 },
      { type: 'FLAG_NOT_SET', flag: 'peste_resolue' },
    ],
    baseWeight: 3,
    choices: [
      {
        id: 'quarantaine',
        label: 'Imposer une quarantaine stricte',
        immediateEffects: { stability: -2, faith: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_contenue' }, { type: 'ADVANCE_CHAIN', chainId: 'peste' }],
      },
      {
        id: 'ignorer',
        label: 'Ne rien changer pour l\'instant',
        immediateEffects: { stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_propagee' }, { type: 'ADVANCE_CHAIN', chainId: 'peste' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Exorciste', reaction: 'Peut y voir un mal a purifier plutot qu\'a soigner.' },
      { roleCode: 'Maître des Poisons', reaction: 'Connait peut-etre un remede — ou la vraie origine du mal.' },
    ],
    chain: { chainId: 'peste', chainName: 'La Grande Peste', stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
    contextAxis: ['les bas-quartiers', 'le port marchand', 'le quartier des tanneurs'],
  },
  {
    id: 'peo-02a',
    category: EventCategory.PEOPLE,
    name: 'La quarantaine tient bon',
    story: 'Les mesures rigoureuses semblent avoir contenu le mal. Reste a savoir jusqu\'a quand les tenir.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'peste_contenue' },
      { type: 'FLAG_NOT_SET', flag: 'peste_resolue' },
    ],
    baseWeight: 4,
    choices: [
      { id: 'lever', label: 'Lever la quarantaine progressivement', immediateEffects: { stability: 2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_resolue' }] },
      { id: 'prolonger', label: 'Prolonger par prudence', immediateEffects: { treasury: -1, stability: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_resolue' }] },
    ],
    roleReactions: [
      { roleCode: 'Maître des Guildes', reaction: 'Le blocage prolonge du commerce lui coute directement.' },
      { roleCode: 'Marchand', reaction: 'Peut profiter de la penurie pour vendre ses reserves a prix d\'or.' },
    ],
    chain: { chainId: 'peste', chainName: 'La Grande Peste', stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-02b',
    category: EventCategory.PEOPLE,
    name: "L'epidemie se propage",
    story: 'L\'inaction a coute cher. Le mal gagne desormais les quartiers riches eux-memes.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'peste_propagee' },
      { type: 'FLAG_NOT_SET', flag: 'peste_resolue' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'mobiliser',
        label: 'Mobiliser tous les guerisseurs du royaume',
        immediateEffects: { treasury: -3, stability: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_resolue' }],
      },
      {
        id: 'laisser',
        label: 'Laisser faire la nature',
        immediateEffects: { stability: -3 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'peste_resolue' }, { type: 'SET_FLAG', flag: 'peste_ravages' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Prophète', reaction: 'Peut y voir — et proclamer — un signe funeste pour le royaume.' },
      { roleCode: 'Fossoyeur de Peste', reaction: 'A deja vecu ce cauchemar une fois ; personne ne l\'ecoute pourtant.' },
    ],
    chain: { chainId: 'peste', chainName: 'La Grande Peste', stage: 2, totalStages: 2 },
    severityAxis: [S.MAJOR, S.CRITICAL],
  },

  // ---- Evenements independants ----
  {
    id: 'peo-03',
    category: EventCategory.PEOPLE,
    name: 'La fete des moissons',
    story: 'Les recoltes ont ete bonnes. Le peuple espere une fete a la hauteur de son labeur.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.TREASURY, value: 3 }],
    baseWeight: 3,
    choices: [
      { id: 'festin', label: 'Offrir un festin au peuple', immediateEffects: { treasury: -2, stability: 3 }, futureConsequences: [] },
      { id: 'modeste', label: 'Celebration modeste', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Bouffon', reaction: 'Peut transformer la fete en spectacle memorable — ou en fiasco.' }],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-04',
    category: EventCategory.PEOPLE,
    name: "La rumeur d'un impot supplementaire",
    story: 'Une rumeur d\'impot nouveau court les tavernes, avant meme qu\'aucune decision ne soit prise.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 5 }],
    baseWeight: 3,
    choices: [
      { id: 'dementir', label: 'Dementir publiquement', immediateEffects: { stability: 1 }, futureConsequences: [] },
      { id: 'confirmer', label: 'Confirmer et lever l\'impot', immediateEffects: { treasury: 2, stability: -2 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Collecteur d\'Impôts', reaction: 'A peut-etre lui-meme lance la rumeur pour tester la reaction populaire.' },
      { roleCode: 'Héraut', reaction: 'Sa proclamation, vraie ou fausse, sera prise pour parole officielle.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-05',
    category: EventCategory.PEOPLE,
    name: 'Le proces populaire de {lieu}',
    story: 'La rumeur accuse {lieu} d\'avoir detourne des fonds destines aux pauvres.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'juger', label: 'Le juger publiquement', immediateEffects: { stability: 2, treasury: -1 }, futureConsequences: [] },
      { id: 'etouffer', label: "Etouffer l'affaire", immediateEffects: { stability: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'corruption_etouffee' }] },
    ],
    roleReactions: [
      { roleCode: 'Inquisiteur', reaction: 'Peut mener l\'instruction avec une severite exemplaire.' },
      { roleCode: 'Maître Chanteur', reaction: 'Peut deja detenir des preuves qu\'il gardait pour lui.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['le Bailli Ferond', 'Dame Ilsevaine', "l'Intendant Corbec"],
  },
  {
    id: 'peo-06',
    category: EventCategory.PEOPLE,
    name: 'La grogne des artisans',
    story: 'Les ateliers menacent de fermer leurs portes si les taxes ne baissent pas.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.STABILITY, value: 5 }],
    baseWeight: 2,
    choices: [
      { id: 'reduire', label: "Reduire les taxes sur l'artisanat", immediateEffects: { treasury: -1, stability: 2 }, futureConsequences: [] },
      { id: 'ignorer', label: 'Ignorer les plaintes', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Maître des Guildes', reaction: 'Porte directement cette revendication devant le Conseil.' },
      { roleCode: 'Révolutionnaire', reaction: 'Y voit un terrain fertile pour recruter des mecontents.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-07',
    category: EventCategory.PEOPLE,
    name: 'L\'orateur sur la place publique',
    story: 'Un homme du peuple harangue la foule chaque matin, critiquant ouvertement le Conseil.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      {
        id: 'laisser',
        label: "Le laisser s'exprimer",
        immediateEffects: { stability: 1 },
        futureConsequences: [{ type: 'WEIGHT_MODIFIER', category: EventCategory.CHAOS, multiplier: 1.2, durationRounds: 2 }],
      },
      { id: 'taire', label: 'Le faire taire', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Révolutionnaire', reaction: 'Peut etre cet orateur lui-meme, sous couvert d\'anonymat.' },
      { roleCode: 'Bouffon', reaction: 'Peut reprendre ses mots en derision pour en attenuer la portee.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-08',
    category: EventCategory.PEOPLE,
    name: 'Le mariage populaire de {lieu}',
    story: 'Le mariage de deux figures aimees de {lieu} enflamme l\'imagination du peuple.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.STABILITY, value: 4 }],
    baseWeight: 2,
    choices: [
      { id: 'dot', label: 'Offrir la dot royale', immediateEffects: { treasury: -1, stability: 2 }, futureConsequences: [] },
      { id: 'rien', label: 'Ne pas s\'en meler', immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Pèlerin', reaction: 'Peut avoir personnellement fait se rencontrer les deux promis.' }],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['la place du Marche', 'le quartier des Tisserands', 'le vieux port'],
  },
  {
    id: 'peo-09',
    category: EventCategory.PEOPLE,
    name: 'La disette de sel',
    story: 'Les reserves de sel s\'epuisent, menacant la conservation des vivres pour l\'hiver.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 4 }],
    baseWeight: 2,
    choices: [
      { id: 'requisitionner', label: 'Requisitionner les reserves des marchands', immediateEffects: { treasury: 1, stability: -1 }, futureConsequences: [] },
      { id: 'importer', label: 'Importer a prix fort', immediateEffects: { treasury: -2, stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Contrebandier', reaction: 'Peut faire venir du sel par des voies que le Tresor ignore.' },
      { roleCode: 'Marchand', reaction: 'Perd gros si ses propres reserves sont requisitionnees.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-10',
    category: EventCategory.PEOPLE,
    name: 'L\'incident lors d\'une execution publique',
    story: 'La foule proteste bruyamment au pied de l\'echafaud, remettant en cause la sentence.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Capitaine de la Garde' }],
    baseWeight: 2,
    choices: [
      { id: 'gracier', label: 'Gracier le condamne sur le champ', immediateEffects: { stability: 2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'grace_royale' }] },
      { id: 'poursuivre', label: "Poursuivre l'execution", immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Capitaine de la Garde', reaction: 'Doit maintenir l\'ordre quelle que soit la decision prise.' },
      { roleCode: 'Bouffon', reaction: 'Peut detourner la tension par une saillie bien placee.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'peo-11',
    category: EventCategory.PEOPLE,
    name: 'Le concours des conteurs',
    story: 'Chaque annee, les conteurs du royaume rivalisent pour la faveur du Conseil.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 1,
    choices: [
      { id: 'financer', label: 'Financer le concours', immediateEffects: { treasury: -1, stability: 1 }, futureConsequences: [] },
      { id: 'rien', label: 'Ne rien organiser', immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Bouffon', reaction: 'Peut concourir lui-meme, avec des histoires qui ne sont pas toujours innocentes.' }],
    severityAxis: [S.MINOR, S.MAJOR],
  },
];
