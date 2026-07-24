import { ResourceKey } from '../../types';
import { EventCategory, EventTemplate, SeverityTier } from '../types';

const S = SeverityTier;

/**
 * Categorie Religion (Foi). Contient la chaine "Le Schisme" (3 templates,
 * 2 etapes) et 9 evenements independants.
 */
export const RELIGION_TEMPLATES: EventTemplate[] = [
  // ---- Chaine : Le Schisme ----
  {
    id: 'rel-01',
    category: EventCategory.RELIGION,
    name: 'Le predicateur de {lieu}',
    story: 'Un predicateur venu de {lieu} attire des foules grandissantes avec une lecture heterodoxe des ecritures.',
    baseConditions: [
      { type: 'ROUND_AT_LEAST', round: 2 },
      { type: 'FLAG_NOT_SET', flag: 'schisme_resolu' },
    ],
    baseWeight: 3,
    choices: [
      {
        id: 'tolerer',
        label: 'Laisser precher librement',
        immediateEffects: { faith: -1, stability: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_tolere' }, { type: 'ADVANCE_CHAIN', chainId: 'schisme' }],
      },
      {
        id: 'faire_taire',
        label: 'Faire taire le predicateur',
        immediateEffects: { faith: 1, stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_reprime' }, { type: 'ADVANCE_CHAIN', chainId: 'schisme' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Cardinal', reaction: 'Doit trancher publiquement entre orthodoxie et tolerance.' },
      { roleCode: 'Grand Prêtre Païen', reaction: 'Voit dans ce trouble une opportunite pour son propre culte.' },
    ],
    chain: { chainId: 'schisme', chainName: 'Le Schisme Religieux', stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
    contextAxis: ['la lointaine Estharie', 'les montagnes de Kaer', 'les steppes du Levant'],
  },
  {
    id: 'rel-02a',
    category: EventCategory.RELIGION,
    name: 'Le concile de reconciliation',
    story: 'Le Cardinal convoque un concile pour trouver un compromis avant que le trouble ne s\'enracine.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'schisme_tolere' },
      { type: 'FLAG_NOT_SET', flag: 'schisme_resolu' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'compromis',
        label: 'Officialiser un compromis religieux',
        immediateEffects: { faith: 1, stability: 2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_resolu' }],
      },
      {
        id: 'division',
        label: "Laisser la division s'installer",
        immediateEffects: { stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_resolu' }, { type: 'SET_FLAG', flag: 'division_religieuse' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Cardinal', reaction: 'Un compromis reussi renforce durablement son autorite morale.' },
      { roleCode: 'Prophète', reaction: 'Peut annoncer une vision qui oriente le concile dans un sens ou l\'autre.' },
    ],
    chain: { chainId: 'schisme', chainName: 'Le Schisme Religieux', stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'rel-02b',
    category: EventCategory.RELIGION,
    name: "L'Inquisition s'abat",
    story: 'La repression a libere une chasse aux heretiques que plus rien ne semble pouvoir arreter.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'schisme_reprime' },
      { type: 'FLAG_NOT_SET', flag: 'schisme_resolu' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'purge',
        label: 'Mener une purge exemplaire',
        immediateEffects: { faith: 2, stability: -2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_resolu' }, { type: 'SET_FLAG', flag: 'purge_religieuse' }],
      },
      {
        id: 'limiter',
        label: 'Limiter les sanctions',
        immediateEffects: { faith: 1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'schisme_resolu' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Inquisiteur', reaction: 'Une purge reussie asseoit durablement son pouvoir de coercition.' },
      { roleCode: 'Hérétique Repenti', reaction: 'Craint particulierement d\'etre rattrape par son propre passe.' },
    ],
    chain: { chainId: 'schisme', chainName: 'Le Schisme Religieux', stage: 2, totalStages: 2 },
    severityAxis: [S.MAJOR, S.CRITICAL],
  },

  // ---- Evenements independants ----
  {
    id: 'rel-03',
    category: EventCategory.RELIGION,
    name: 'Le miracle conteste de {lieu}',
    story: 'Une source aurait gueri des malades incurables pres de {lieu}. Le peuple y voit deja un miracle.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.FAITH, value: 6 }],
    baseWeight: 2,
    choices: [
      { id: 'proclamer', label: 'Proclamer un vrai miracle', immediateEffects: { faith: 2, stability: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'miracle_proclame' }] },
      { id: 'enqueter', label: 'Enqueter avant de se prononcer', immediateEffects: { faith: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Prophète', reaction: 'Peut revendiquer avoir predit ce miracle a l\'avance.' },
      { roleCode: 'Moine Copiste', reaction: 'Peut verifier discretement les faits dans les archives.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['Sainte-Aube', 'le Bois des Larmes', 'la Fontaine Grise'],
  },
  {
    id: 'rel-04',
    category: EventCategory.RELIGION,
    name: 'La relique volee',
    story: 'Une relique majeure a disparu de la cathedrale durant la nuit.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'chasse', label: 'Lancer une chasse au voleur', immediateEffects: { treasury: -1, faith: 1 }, futureConsequences: [] },
      { id: 'copie', label: 'Faire fabriquer une copie', immediateEffects: { treasury: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'relique_copie' }] },
    ],
    roleReactions: [
      { roleCode: 'Voleur', reaction: 'Peut savoir exactement ou se trouve la relique volee.' },
      { roleCode: 'Faussaire', reaction: 'Peut fournir une copie suffisamment convaincante pour tromper les fideles.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'rel-05',
    category: EventCategory.RELIGION,
    name: 'Le pelerinage annuel vers {lieu}',
    story: 'Des milliers de fideles s\'apprêtent a partir en pelerinage vers {lieu}.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.STABILITY, value: 4 }],
    baseWeight: 2,
    choices: [
      { id: 'financer', label: 'Financer un grand pelerinage', immediateEffects: { treasury: -1, faith: 2 }, futureConsequences: [] },
      { id: 'reduire', label: 'Reduire les depenses cette annee', immediateEffects: { faith: -1 }, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Pèlerin', reaction: 'Peut mener personnellement le convoi et en tirer un prestige durable.' }],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['la Cite Sainte', "l'Abbaye du Silence", 'le Mont des Vigiles'],
  },
  {
    id: 'rel-06',
    category: EventCategory.RELIGION,
    name: "L'exorcisme public",
    story: 'Une jeune femme, prise de convulsions sur la place du marche, est declaree possedee.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.STABILITY, value: 5 }],
    baseWeight: 2,
    choices: [
      { id: 'autoriser', label: 'Autoriser un exorcisme public', immediateEffects: { faith: 1, stability: 1 }, futureConsequences: [] },
      { id: 'interdire', label: 'Interdire ce spectacle', immediateEffects: { faith: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Exorciste', reaction: 'Peut mener le rite lui-meme, quel que soit le mal reel en cause.' },
      { roleCode: 'Sorcier', reaction: 'Sait peut-etre que le mal en question n\'a rien de surnaturel.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'rel-07',
    category: EventCategory.RELIGION,
    name: "Le don de {lieu}",
    story: '{lieu}, noble mourant sans heritier, lègue sa fortune a l\'Eglise — a certaines conditions.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 2,
    choices: [
      { id: 'accepter', label: "Accepter au nom de l'Eglise", immediateEffects: { faith: 2, treasury: 1 }, futureConsequences: [] },
      { id: 'refuser', label: 'Refuser, don empoisonne politiquement', immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [{ roleCode: 'Cardinal', reaction: 'Peut negocier des conditions plus favorables encore a l\'Eglise.' }],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['le vieux Baron Corvenne', 'Dame Aurelie de Puissac', "l'ermite Tholan"],
  },
  {
    id: 'rel-08',
    category: EventCategory.RELIGION,
    name: 'La secheresse, punition divine ?',
    story: 'Aucune pluie depuis des semaines. Les pretres murmurent une colere divine.',
    baseConditions: [{ type: 'RESOURCE_BELOW', resource: ResourceKey.TREASURY, value: 5 }],
    baseWeight: 2,
    choices: [
      { id: 'jeune', label: 'Ordonner des jours de jeune', immediateEffects: { faith: 1, stability: -1 }, futureConsequences: [] },
      { id: 'puits', label: 'Financer des puits', immediateEffects: { treasury: -2, stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Prophète', reaction: 'Peut designer un coupable a la colere divine, au choix.' },
      { roleCode: 'Grand Prêtre Païen', reaction: 'Propose une explication rivale, non-orthodoxe, a la secheresse.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'rel-09',
    category: EventCategory.RELIGION,
    name: "Le proces d'une guerisseuse",
    story: 'Une guerisseuse de village est accusee de sorcellerie apres la mort inexpliquee d\'un enfant.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'condamner', label: 'La condamner pour sorcellerie', immediateEffects: { faith: 1, stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'guerisseuse_condamnee' }] },
      { id: 'proteger', label: 'La proteger sous conditions', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Inquisiteur', reaction: 'Peut mener l\'interrogatoire lui-meme, avec toute la rigueur voulue.' },
      { roleCode: 'Sorcier', reaction: 'Sait si cette guerisseuse pratique reellement un art interdit.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'rel-10',
    category: EventCategory.RELIGION,
    name: "La cathedrale inachevee",
    story: 'Les travaux de la grande cathedrale sont arretes faute de fonds depuis deux ans.',
    baseConditions: [{ type: 'RESOURCE_ABOVE', resource: ResourceKey.TREASURY, value: 5 }],
    baseWeight: 2,
    choices: [
      { id: 'achever', label: "Financer l'achevement des travaux", immediateEffects: { treasury: -3, faith: 2 }, futureConsequences: [] },
      { id: 'suspendre', label: 'Suspendre les travaux', immediateEffects: { faith: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Architecte Royal', reaction: 'Peut y voir l\'oeuvre de sa carriere, quel qu\'en soit le cout.' },
      { roleCode: 'Cardinal', reaction: 'Une cathedrale achevee renforce durablement son prestige.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'rel-11',
    category: EventCategory.RELIGION,
    name: 'Le debat theologique a la cour',
    story: 'Deux ecoles de pensee s\'affrontent devant le Conseil sur la nature exacte de la Foi.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 2,
    choices: [
      { id: 'orthodoxie', label: "Trancher en faveur de l'orthodoxie", immediateEffects: { faith: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'orthodoxie_affirmee' }] },
      { id: 'debat', label: 'Encourager le debat libre', immediateEffects: { stability: 1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Cardinal', reaction: 'Defend naturellement la lecture orthodoxe.' },
      { roleCode: 'Hérétique Repenti', reaction: 'Se retrouve au coeur d\'un debat qui rappelle son propre passe.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
];
