import { ResourceKey } from '../../types';
import { EventCategory, EventTemplate, SeverityTier } from '../types';

const S = SeverityTier;

/**
 * Categorie Guerre (Armee). Contient la chaine "La Guerre des Frontieres"
 * (3 templates, 2 etapes) et 9 evenements independants.
 */
export const WAR_TEMPLATES: EventTemplate[] = [
  // ---- Chaine : La Guerre des Frontieres ----
  {
    id: 'war-01',
    category: EventCategory.WAR,
    name: 'Escarmouche a {lieu}',
    story: 'Des cavaliers etrangers ont ete apercus pres de {lieu}. Une reponse est attendue avant la nuit.',
    baseConditions: [
      { type: 'ROUND_AT_LEAST', round: 1 },
      { type: 'FLAG_NOT_SET', flag: 'guerre_frontiere_resolue' },
    ],
    baseWeight: 3,
    choices: [
      {
        id: 'riposter',
        label: 'Riposter fermement',
        immediateEffects: { army: -1, stability: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'frontiere_ripostee' }, { type: 'ADVANCE_CHAIN', chainId: 'guerre-frontiere' }],
      },
      {
        id: 'treve',
        label: 'Proposer une treve immediate',
        immediateEffects: { stability: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'frontiere_treve' }, { type: 'ADVANCE_CHAIN', chainId: 'guerre-frontiere' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Général', reaction: 'Peut prendre le commandement personnel de la riposte, gagnant en prestige si elle reussit.' },
      { roleCode: 'Vétéran de Guerre', reaction: "Peut temoigner publiquement des risques d'escalade." },
    ],
    chain: { chainId: 'guerre-frontiere', chainName: 'La Guerre des Frontieres', stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
    contextAxis: ['la Marche du Nord', 'le Col des Loups', "les Rives de l'Est"],
  },
  {
    id: 'war-02a',
    category: EventCategory.WAR,
    name: 'La charge decisive',
    story: 'Les deux armees se font face. Le moment de frapper est venu.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'frontiere_ripostee' },
      { type: 'FLAG_NOT_SET', flag: 'guerre_frontiere_resolue' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'charger',
        label: 'Charger en premiere ligne',
        immediateEffects: { army: -2, stability: 3 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'guerre_frontiere_resolue' }, { type: 'SET_FLAG', flag: 'victoire_frontiere' }],
      },
      {
        id: 'manoeuvrer',
        label: 'Manoeuvrer prudemment',
        immediateEffects: { army: -1, stability: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'guerre_frontiere_resolue' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Général', reaction: 'Une victoire ici asseoit durablement son autorite militaire.' },
      { roleCode: 'Chevalier', reaction: 'Peut se distinguer en duel avant la bataille, renforcant le moral.' },
    ],
    chain: { chainId: 'guerre-frontiere', chainName: 'La Guerre des Frontieres', stage: 2, totalStages: 2 },
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'war-02b',
    category: EventCategory.WAR,
    name: 'Le traite de paix',
    story: 'Les emissaires ennemis acceptent de negocier. Reste a fixer les termes.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'frontiere_treve' },
      { type: 'FLAG_NOT_SET', flag: 'guerre_frontiere_resolue' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'equitable',
        label: 'Signer un traite equitable',
        immediateEffects: { stability: 2, treasury: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'guerre_frontiere_resolue' }, { type: 'SET_FLAG', flag: 'paix_frontiere' }],
      },
      {
        id: 'humilier',
        label: 'Imposer des conditions humiliantes',
        immediateEffects: { treasury: 2, stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'guerre_frontiere_resolue' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Diplomate', reaction: 'Peut negocier des clauses supplementaires en secret.' },
      { roleCode: 'Ambassadeur Étranger', reaction: 'A ses propres interets dans les termes exacts du traite.' },
    ],
    chain: { chainId: 'guerre-frontiere', chainName: 'La Guerre des Frontieres', stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },

  // ---- Evenements independants ----
  {
    id: 'war-04',
    category: EventCategory.WAR,
    name: 'La mutinerie des soldes impayees',
    story: 'Les garnisons grondent : deux mois de solde manquent a l\'appel.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 5 }],
    baseWeight: 3,
    choices: [
      { id: 'payer', label: 'Payer immediatement', immediateEffects: { treasury: -2, army: 1 }, futureConsequences: [] },
      { id: 'punir', label: 'Punir les meneurs', immediateEffects: { army: -1, stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Commandant', reaction: 'Peut identifier les meneurs avant que la mutinerie ne se propage.' },
      { roleCode: 'Mercenaire', reaction: 'Peut monnayer sa loyaute au plus offrant durant la crise.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'war-05',
    category: EventCategory.WAR,
    name: 'L\'offre de {lieu}',
    story: '{lieu}, mercenaire de renom, propose ses services au plus offrant.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.TREASURY, value: 3 }],
    baseWeight: 2,
    choices: [
      { id: 'engager', label: "Engager a prix d'or", immediateEffects: { treasury: -3, army: 3 }, futureConsequences: [] },
      { id: 'refuser', label: 'Refuser, trop couteux', immediateEffects: {}, futureConsequences: [{ type: 'SET_FLAG', flag: 'mercenaire_refuse' }] },
    ],
    roleReactions: [
      { roleCode: 'Mercenaire', reaction: 'Peut connaitre personnellement ce rival et influencer la negociation.' },
      { roleCode: 'Général', reaction: "Peut voir d'un mauvais oeil l'arrivee d'une troupe qu'il ne commande pas." },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['Bragane le Roux', 'la Compagnie du Loup', 'Ysendre Sanscœur'],
  },
  {
    id: 'war-06',
    category: EventCategory.WAR,
    name: "La desertion d'une garnison",
    story: 'Une garnison entiere a disparu dans la nuit, armes et vivres emportes.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.STABILITY, value: 4 }],
    baseWeight: 2,
    choices: [
      { id: 'traquer', label: 'Traquer les deserteurs', immediateEffects: { army: -1, stability: -1 }, futureConsequences: [] },
      { id: 'ignorer', label: 'Fermer les yeux', immediateEffects: { army: -1 }, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Capitaine de la Garde', reaction: 'Peut recuperer une partie des deserteurs en echange de clemence.' }],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'war-07',
    category: EventCategory.WAR,
    name: 'Le siege de {lieu}',
    story: 'Une place forte alliee, {lieu}, est assiegee et appelle a l\'aide.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.ARMY, value: 4 }],
    baseWeight: 2,
    choices: [
      { id: 'renforts', label: 'Envoyer des renforts', immediateEffects: { army: -2, stability: 2 }, futureConsequences: [] },
      { id: 'abandonner', label: 'Abandonner la place', immediateEffects: { stability: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'place_abandonnee' }] },
    ],
    roleReactions: [
      { roleCode: 'Général', reaction: 'Peut juger le siege indefendable et le dire publiquement.' },
      { roleCode: 'Commandant', reaction: 'Peut mener personnellement les renforts pour se distinguer.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
    contextAxis: ['Valombre', 'Ferrécoeur', "Sainte-Aune"],
  },
  {
    id: 'war-08',
    category: EventCategory.WAR,
    name: 'La flotte pirate en mer',
    story: 'Des voiles noires pillent les cotes marchandes depuis trois semaines.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'chasser', label: 'Financer une chasse aux pirates', immediateEffects: { treasury: -2, army: 1 }, futureConsequences: [] },
      { id: 'tribut', label: 'Negocier un tribut de passage', immediateEffects: { treasury: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Amiral', reaction: 'Peut reconnaitre parmi les pirates d\'anciens hommes a lui.' },
      { roleCode: 'Contrebandier', reaction: 'Entretient peut-etre des liens discrets avec ces memes pirates.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'war-09',
    category: EventCategory.WAR,
    name: 'Le duel qui a mal tourne',
    story: 'Un duel d\'honneur entre chevaliers a degenere devant une foule de courtisans.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Chevalier' }],
    baseWeight: 2,
    choices: [
      { id: 'defendre', label: 'Defendre le chevalier publiquement', immediateEffects: { stability: 1 }, futureConsequences: [] },
      { id: 'laisser', label: 'Le laisser assumer seul', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Chevalier', reaction: 'Son honneur personnel est directement engage dans l\'issue.' },
      { roleCode: 'Bouffon', reaction: 'Peut tourner l\'incident en spectacle pour detourner la honte.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'war-10',
    category: EventCategory.WAR,
    name: "L'arsenal secret decouvert",
    story: 'Un arsenal oublie, riche en armes anciennes, est retrouve sous une ancienne caserne.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.ARMY, value: 5 }],
    baseWeight: 2,
    choices: [
      { id: 'distribuer', label: 'Distribuer les armes aux troupes', immediateEffects: { army: 2, treasury: -1 }, futureConsequences: [] },
      { id: 'vendre', label: "Vendre l'arsenal", immediateEffects: { treasury: 2 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Maître d\'Armes', reaction: 'Peut evaluer la vraie valeur de cet arsenal avant toute decision.' },
      { roleCode: 'Contrebandier', reaction: 'Connait deja des acheteurs interesses hors du royaume.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'war-11',
    category: EventCategory.WAR,
    name: "La demande d'alliance de {lieu}",
    story: '{lieu} propose un pacte militaire, en echange d\'un soutien financier immediat.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      {
        id: 'accepter',
        label: "Accepter l'alliance",
        immediateEffects: { army: 1, treasury: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'alliance_militaire' }],
      },
      { id: 'decliner', label: 'Decliner poliment', immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Ambassadeur Étranger', reaction: "A un interet direct, souvent cache, dans l'issue de cette demande." },
      { roleCode: 'Diplomate', reaction: 'Peut ameliorer les termes du pacte avant sa signature.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['le Royaume de Valcerre', "la Confederation d'Ambre", 'les Cites Libres du Sud'],
  },
  {
    id: 'war-12',
    category: EventCategory.WAR,
    name: 'Le veteran accuse de trahison',
    story: 'Un officier decore est accuse d\'avoir vendu des plans militaires a l\'ennemi.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Vétéran de Guerre' }],
    baseWeight: 2,
    choices: [
      { id: 'proces', label: 'Ouvrir un proces militaire', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'proces_militaire' }] },
      { id: 'classer', label: "Classer l'affaire sans suite", immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Vétéran de Guerre', reaction: 'Peut temoigner en faveur ou en defaveur de l\'accuse selon son propre interet.' },
      { roleCode: 'Inquisiteur', reaction: "Peut extraire des aveux, vrais ou forces, sous la contrainte." },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
];
