import { EventCategory, EventTemplate, SeverityTier } from '../types';
import { ResourceKey } from '../../types';

const S = SeverityTier;

/**
 * Categorie Economie (Tresor). Contient la chaine "La Famine du Nord"
 * (3 templates, 2 etapes) et 9 evenements independants.
 */
export const ECONOMY_TEMPLATES: EventTemplate[] = [
  // ---- Chaine : La Famine du Nord ----
  {
    id: 'econ-01',
    category: EventCategory.ECONOMY,
    name: 'Les greniers vides de {lieu}',
    story:
      "A {lieu}, les greniers communaux sonnent creux. Les intendants locaux reclament une decision avant que la faim ne tourne a l'emeute.",
    baseConditions: [
      { type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 5 },
      { type: 'ROUND_AT_LEAST', round: 2 },
      { type: 'FLAG_NOT_SET', flag: 'famine_nord_resolue' },
    ],
    baseWeight: 3,
    choices: [
      {
        id: 'ouvrir',
        label: 'Ouvrir les greniers royaux',
        immediateEffects: { treasury: -2, stability: 2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'famine_relievee' }, { type: 'ADVANCE_CHAIN', chainId: 'famine-nord' }],
      },
      {
        id: 'ignorer',
        label: 'Detourner le regard',
        immediateEffects: { stability: -1 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'famine_ignoree' },
          { type: 'DELAYED_RESOURCE_DELTA', resource: ResourceKey.STABILITY, amount: -2, roundsLater: 1 },
          { type: 'ADVANCE_CHAIN', chainId: 'famine-nord' },
        ],
      },
    ],
    roleReactions: [
      { roleCode: 'Marchand', reaction: 'Peut vendre son propre stock au royaume contre une forte commission, adoucissant le cout du secours.' },
      { roleCode: 'Révolutionnaire', reaction: "Profite de l'inaction pour recruter du soutien populaire en secret." },
    ],
    chain: { chainId: 'famine-nord', chainName: 'La Famine du Nord', stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
    contextAxis: ['la Vallée du Blé', 'le Comté de Riverfeuille', 'les Faubourgs du Nord'],
  },
  {
    id: 'econ-02',
    category: EventCategory.ECONOMY,
    name: 'La gratitude du Nord',
    story: 'Les villages secourus envoient des delegations au Conseil pour remercier la couronne de sa clemence.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'famine_relievee' },
      { type: 'FLAG_NOT_SET', flag: 'famine_nord_resolue' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'hommages',
        label: 'Accepter les hommages publics',
        immediateEffects: { stability: 1, treasury: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'famine_nord_resolue' }],
      },
      {
        id: 'modestie',
        label: 'Rester modeste',
        immediateEffects: { stability: 2 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'famine_nord_resolue' },
          { type: 'WEIGHT_MODIFIER', category: EventCategory.PEOPLE, multiplier: 0.8, durationRounds: 2 },
        ],
      },
    ],
    roleReactions: [{ roleCode: 'Prince', reaction: 'Peut recuperer publiquement le merite du secours pour asseoir sa legitimite.' }],
    chain: { chainId: 'famine-nord', chainName: 'La Famine du Nord', stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'econ-03',
    category: EventCategory.ECONOMY,
    name: 'La revolte des gueux',
    story: "L'inaction du Conseil a nourri la colere. Des bandes armees de fourches marchent sur les greniers seigneuriaux.",
    baseConditions: [
      { type: 'FLAG_SET', flag: 'famine_ignoree' },
      { type: 'FLAG_NOT_SET', flag: 'famine_nord_resolue' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'reprimer',
        label: 'Reprimer dans le sang',
        immediateEffects: { army: -1, stability: -2, treasury: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'famine_nord_resolue' }, { type: 'SET_FLAG', flag: 'memoire_repression' }],
      },
      {
        id: 'negocier',
        label: 'Negocier avec les meneurs',
        immediateEffects: { stability: 1, treasury: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'famine_nord_resolue' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Révolutionnaire', reaction: 'Peut se reveler comme meneur de la revolte, gagnant en soutien cache quelle que soit l\'issue.' },
      { roleCode: 'Capitaine de la Garde', reaction: "Peut arreter un meneur pour desamorcer la revolte avant le vote." },
    ],
    chain: { chainId: 'famine-nord', chainName: 'La Famine du Nord', stage: 2, totalStages: 2 },
    severityAxis: [S.MAJOR, S.CRITICAL],
  },

  // ---- Evenements independants ----
  {
    id: 'econ-04',
    category: EventCategory.ECONOMY,
    name: 'Le naufrage du convoi de {lieu}',
    story: 'Une tempete a englouti un convoi marchand au large de {lieu}. Les pertes menacent plusieurs contrats en cours.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 3,
    choices: [
      {
        id: 'remplacer',
        label: 'Financer un nouveau convoi',
        immediateEffects: { treasury: -2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'convoi_remplace' }],
      },
      { id: 'accepter', label: 'Accepter la perte', immediateEffects: { treasury: -1, stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Amiral', reaction: 'Peut proposer une flotte de remplacement a moitie prix.' },
      { roleCode: 'Contrebandier', reaction: 'Peut recuperer une partie de la cargaison perdue en secret, a son seul profit.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['le Cap des Tempetes', "l'Estuaire Gris", 'les Bancs de Sable'],
  },
  {
    id: 'econ-05',
    category: EventCategory.ECONOMY,
    name: "La foire d'automne",
    story: 'Marchands et artisans demandent une grande foire pour relancer les echanges avant les frimas.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.STABILITY, value: 3 }],
    baseWeight: 3,
    choices: [
      {
        id: 'financer',
        label: 'Financer une grande foire',
        immediateEffects: { treasury: -1, stability: 2 },
        futureConsequences: [{ type: 'WEIGHT_MODIFIER', category: EventCategory.ECONOMY, multiplier: 1.2, durationRounds: 2 }],
      },
      { id: 'limiter', label: 'Limiter les festivites', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Marchand', reaction: 'Peut tripler ses profits personnels en y investissant.' }],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'econ-06',
    category: EventCategory.ECONOMY,
    name: 'La devaluation de la monnaie',
    story: 'Le Tresor est a sec. Le maitre de la Monnaie propose de frapper de nouvelles pieces, allegees en argent.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 4 }],
    baseWeight: 3,
    choices: [
      {
        id: 'frapper',
        label: 'Frapper une nouvelle monnaie',
        immediateEffects: { treasury: 3, stability: -2 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'monnaie_devaluee' },
          { type: 'DELAYED_RESOURCE_DELTA', resource: ResourceKey.TREASURY, amount: -1, roundsLater: 2 },
        ],
      },
      {
        id: 'emprunter',
        label: 'Emprunter aux banques etrangeres',
        immediateEffects: { treasury: 2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'dette_etrangere' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Banquier', reaction: 'Profite personnellement de tout emprunt contracte, quel que soit le choix.' },
      { roleCode: 'Usurier', reaction: 'Peut proposer un pret a taux exorbitant en alternative secrete.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'econ-07',
    category: EventCategory.ECONOMY,
    name: 'Le differend de {lieu}',
    story: '{lieu} accuse une guilde rivale de pratiques deloyales et exige un arbitrage du Conseil.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'trancher', label: 'Trancher en faveur du plaignant', immediateEffects: { stability: 1, treasury: -1 }, futureConsequences: [] },
      { id: 'ignorer', label: 'Ignorer le differend', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'guildes_mecontentes' }] },
    ],
    roleReactions: [{ roleCode: 'Maître des Guildes', reaction: 'Doit choisir un camp publiquement, au risque de perdre le soutien de l\'autre.' }],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['la Guilde des Tisserands', 'la Guilde des Orfevres', 'la Guilde des Bouchers'],
  },
  {
    id: 'econ-08',
    category: EventCategory.ECONOMY,
    name: 'La route des epices rouverte',
    story: "Une route commerciale longtemps coupee redevient praticable, sous reserve d'y investir pour la securiser.",
    baseConditions: [{ type: 'FLAG_NOT_SET', flag: 'route_epices_fermee' }],
    baseWeight: 2,
    choices: [
      {
        id: 'securiser',
        label: 'Investir dans la securisation',
        immediateEffects: { treasury: -2 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'route_epices_securisee' },
          { type: 'DELAYED_RESOURCE_DELTA', resource: ResourceKey.TREASURY, amount: 3, roundsLater: 2 },
        ],
      },
      { id: 'laisser', label: 'Laisser faire le marche libre', immediateEffects: { treasury: 1 }, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Marchand', reaction: "Peut s'approprier une part de la route pour son propre compte." }],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'econ-09',
    category: EventCategory.ECONOMY,
    name: "L'incendie des entrepots",
    story: 'Un incendie ravage les entrepots royaux durant la nuit. Les circonstances restent troubles.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.STABILITY, value: 6 }],
    baseWeight: 3,
    choices: [
      { id: 'enquete', label: 'Ouvrir une enquete', immediateEffects: { stability: 1, treasury: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'incendie_enquete' }] },
      { id: 'etouffer', label: "Etouffer l'affaire", immediateEffects: { treasury: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'incendie_etouffe' }] },
    ],
    roleReactions: [
      { roleCode: 'Inquisiteur', reaction: 'Peut designer un coupable, vrai ou non, pour clore rapidement l\'enquete.' },
      { roleCode: 'Faussaire', reaction: "Peut avoir fabrique de fausses preuves, a l'insu de tous." },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'econ-10',
    category: EventCategory.ECONOMY,
    name: 'Le tribut de {lieu}',
    story: '{lieu} demande une reduction du tribut annuel, invoquant une recolte desastreuse.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.ARMY, value: 3 }],
    baseWeight: 2,
    choices: [
      { id: 'exiger', label: 'Exiger le tribut complet', immediateEffects: { treasury: 2, stability: -1 }, futureConsequences: [] },
      { id: 'reduire', label: 'Reduire le tribut par clemence', immediateEffects: { stability: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'clemence_connue' }] },
    ],
    roleReactions: [{ roleCode: 'Duc', reaction: "Peut interceder en secret pour le vassal, s'il y a un interet personnel." }],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['le Vassal de Grisemont', 'le Vassal des Marches', 'le Vassal du Val Perdu'],
  },
  {
    id: 'econ-11',
    category: EventCategory.ECONOMY,
    name: 'La speculation sur le grain',
    story: 'Des marchands rachetent le grain en masse pour le revendre au prix fort. La rumeur court plus vite que le pain.',
    baseConditions: [
      { type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 6 },
      { type: 'ROUND_AT_LEAST', round: 3 },
    ],
    baseWeight: 2,
    choices: [
      { id: 'plafonner', label: 'Plafonner les prix par decret', immediateEffects: { stability: 2, treasury: -1 }, futureConsequences: [] },
      { id: 'laisser', label: 'Laisser faire les speculateurs', immediateEffects: { treasury: 2, stability: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'speculation_toleree' }] },
    ],
    roleReactions: [
      { roleCode: 'Usurier', reaction: 'Profite directement de la speculation toleree.' },
      { roleCode: 'Maître des Guildes', reaction: 'Peut organiser un boycott si les prix ne sont pas plafonnes.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'econ-12',
    category: EventCategory.ECONOMY,
    name: "L'heritage contesté de {lieu}",
    story: 'La fortune d\'un riche marchand de {lieu} est disputee entre trois pretendants, chacun brandissant un testament.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'legitime', label: "Trancher en faveur de l'heritier legitime", immediateEffects: { stability: 1 }, futureConsequences: [] },
      { id: 'confisquer', label: 'Confisquer une part au profit du tresor', immediateEffects: { treasury: 2, stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Chancelier', reaction: "Peut faire pencher la decision legale dans le sens qui l'arrange." },
      { roleCode: 'Faussaire', reaction: 'Peut avoir falsifie le testament en amont.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['la Maison Vaudrel', 'la Maison Ferrant', 'la Maison Solenne'],
  },
];
