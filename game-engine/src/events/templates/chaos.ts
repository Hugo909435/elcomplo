import { ResourceKey } from '../../types';
import { EventCategory, EventTemplate, SeverityTier } from '../types';

const S = SeverityTier;

/**
 * Categorie Chaos. Pas de chaine dediee — ces evenements retissent des
 * flags poses par d'autres categories (ex: mefiance apres une repression)
 * pour rester coherents avec l'histoire deja jouee.
 */
export const CHAOS_TEMPLATES: EventTemplate[] = [
  {
    id: 'cha-01',
    category: EventCategory.CHAOS,
    name: "L'apparition d'une comete",
    story: 'Une comete traverse le ciel trois nuits durant. Le peuple y cherche deja un sens.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 2,
    choices: [
      { id: 'signe', label: 'Proclamer un signe funeste', immediateEffects: { faith: 1, stability: -1 }, futureConsequences: [] },
      { id: 'rassurer', label: 'Rassurer le peuple par la science', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Prophète', reaction: 'Peut y voir la confirmation eclatante d\'une de ses propres predictions.' },
      { roleCode: 'Devin Fou', reaction: 'Y voit midi a sa porte, quelle que soit la question posee.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'cha-02',
    category: EventCategory.CHAOS,
    name: 'Le sorcier arrete aux portes',
    story: 'Un homme aux pratiques troubles a ete surpris pratiquant un rite interdit hors des murs.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Sorcier' }],
    baseWeight: 2,
    choices: [
      { id: 'bruler', label: 'Le bruler en place publique', immediateEffects: { faith: 1, stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'sorcier_execute' }] },
      { id: 'bannir', label: 'Le bannir simplement', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Sorcier', reaction: 'Son propre sort — et ses secrets — dependent directement de ce jugement.' },
      { roleCode: 'Inquisiteur', reaction: 'Peut y voir l\'occasion d\'un exemple retentissant.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'cha-03',
    category: EventCategory.CHAOS,
    name: 'La nuit des masques',
    story: 'Un bal masque non autorise s\'organise dans les caves de la capitale, brouillant tous les rangs.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.STABILITY, value: 4 }],
    baseWeight: 2,
    choices: [
      {
        id: 'autoriser',
        label: 'Autoriser le bal masque',
        immediateEffects: { stability: 1 },
        futureConsequences: [{ type: 'WEIGHT_MODIFIER', category: EventCategory.CHAOS, multiplier: 1.3, durationRounds: 2 }],
      },
      { id: 'interdire', label: 'Interdire ce desordre', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Ombre', reaction: 'Prospere naturellement dans une foule ou personne ne reconnait personne.' },
      { roleCode: 'Bouffon', reaction: 'Peut y organiser le spectacle le plus memorable de la saison.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'cha-04',
    category: EventCategory.CHAOS,
    name: 'Le tremblement de terre de {lieu}',
    story: 'La terre a tremble a {lieu}, effondrant plusieurs batiments et semant la panique.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'secours', label: 'Mobiliser les secours royaux', immediateEffects: { treasury: -2, stability: 1 }, futureConsequences: [] },
      { id: 'laisser', label: 'Laisser les provinces se debrouiller', immediateEffects: { stability: -2 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Architecte Royal', reaction: 'Peut deja avoir alerte sur la fragilite de ces batiments, en vain.' },
      { roleCode: 'Fossoyeur de Peste', reaction: 'Sait comment organiser les secours face a un desastre de masse.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
    contextAxis: ['la Basse-Ville', 'le quartier du Pont', 'les collines de Verre'],
  },
  {
    id: 'cha-05',
    category: EventCategory.CHAOS,
    name: 'Le fou qui predit la chute',
    story: 'Un homme errant proclame chaque jour sur la place que le royaume tombera avant l\'hiver.',
    baseConditions: [{ type: 'FLAG_NOT_SET', flag: 'prediction_chute' }],
    baseWeight: 2,
    choices: [
      { id: 'taire', label: 'Le faire taire', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'prediction_chute' }] },
      {
        id: 'laisser',
        label: 'Le laisser prophetiser',
        immediateEffects: { faith: -1 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'prediction_chute' },
          { type: 'WEIGHT_MODIFIER', category: EventCategory.CHAOS, multiplier: 1.2, durationRounds: 2 },
        ],
      },
    ],
    roleReactions: [
      { roleCode: 'Devin Fou', reaction: 'Peut reconnaitre en lui un rival — ou un frere d\'armes.' },
      { roleCode: 'Bouffon', reaction: 'Peut recuperer ses propos pour en attenuer la portee par le rire.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'cha-06',
    category: EventCategory.CHAOS,
    name: 'La disparition de {lieu}',
    story: '{lieu}, conseiller respecte, s\'est volatilise sans laisser de trace il y a trois jours.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'enqueter', label: 'Lancer une enquete approfondie', immediateEffects: { treasury: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'disparition_enquetee' }] },
      { id: 'classer', label: "Classer l'affaire", immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Espion', reaction: 'Peut deja savoir ce qu\'il est advenu de ce conseiller.' },
      { roleCode: 'Assassin', reaction: 'Peut etre directement responsable de cette disparition.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['maitre Orvalle', 'dame Yseult', "l'intendant Brasec"],
  },
  {
    id: 'cha-07',
    category: EventCategory.CHAOS,
    name: 'Le marche noir de reliques',
    story: 'Un reseau clandestin ecoule des objets sacres voles a travers tout le royaume.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Contrebandier' }],
    baseWeight: 2,
    choices: [
      { id: 'demanteler', label: 'Demanteler le reseau', immediateEffects: { stability: 1, treasury: -1 }, futureConsequences: [] },
      { id: 'fermer_yeux', label: 'Fermer les yeux contre commission', immediateEffects: { treasury: 1, faith: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Contrebandier', reaction: 'Ce reseau est peut-etre le sien.' },
      { roleCode: 'Voleur', reaction: 'Connait les circuits de ce marche mieux que quiconque.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'cha-08',
    category: EventCategory.CHAOS,
    name: "L'incendie inexplique de {lieu}",
    story: 'Une chapelle de {lieu} a brule cette nuit sans cause apparente.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 2,
    choices: [
      { id: 'signe', label: 'Y voir un signe divin a interpreter', immediateEffects: { faith: 1, stability: -1 }, futureConsequences: [] },
      { id: 'enqueter', label: 'Enqueter sur un acte criminel', immediateEffects: { treasury: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'incendie_chapelle_enquete' }] },
    ],
    roleReactions: [
      { roleCode: 'Nécromancien', reaction: 'Peut pretendre y avoir senti la main des morts.' },
      { roleCode: 'Exorciste', reaction: 'Peut y voir une manifestation qu\'il est seul a pouvoir traiter.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['Sainte-Aune', 'Val-Roman', 'la Chapelle des Marais'],
  },
  {
    id: 'cha-09',
    category: EventCategory.CHAOS,
    name: 'Le double du Roi defunt',
    story: 'Plusieurs temoins jurent avoir apercu le defunt Roi marcher, la nuit, dans les rues de la capitale.',
    baseConditions: [{ type: 'FLAG_NOT_SET', flag: 'double_roi_vu' }],
    baseWeight: 1,
    choices: [
      { id: 'taire', label: 'Faire taire les temoins', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'double_roi_vu' }] },
      {
        id: 'laisser',
        label: 'Laisser courir la legende',
        immediateEffects: { faith: 1 },
        futureConsequences: [
          { type: 'SET_FLAG', flag: 'double_roi_vu' },
          { type: 'WEIGHT_MODIFIER', category: EventCategory.CHAOS, multiplier: 1.2, durationRounds: 3 },
        ],
      },
    ],
    roleReactions: [
      { roleCode: 'Nécromancien', reaction: 'Peut revendiquer avoir un lien direct avec cette apparition.' },
      { roleCode: 'Bâtard Royal', reaction: 'Cette legende pourrait servir — ou nuire — a sa propre cause.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'cha-10',
    category: EventCategory.CHAOS,
    name: 'Les tracts seditieux',
    story: 'Des tracts appelant a renverser le Conseil circulent de main en main dans toute la capitale.',
    baseConditions: [{ type: 'ROLE_PRESENT', roleCode: 'Anarchiste' }],
    baseWeight: 2,
    choices: [
      { id: 'saisir', label: 'Faire saisir les tracts', immediateEffects: { stability: -1 }, futureConsequences: [] },
      {
        id: 'laisser',
        label: 'Laisser circuler, signe de liberte',
        immediateEffects: { stability: 1 },
        futureConsequences: [{ type: 'WEIGHT_MODIFIER', category: EventCategory.CHAOS, multiplier: 1.15, durationRounds: 2 }],
      },
    ],
    roleReactions: [
      { roleCode: 'Anarchiste', reaction: 'En est peut-etre lui-meme l\'auteur, ouvertement ou non.' },
      { roleCode: 'Révolutionnaire', reaction: 'Peut y voir un allie objectif, sans jamais l\'admettre publiquement.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
  },
];
