import { EventCategory, EventTemplate, SeverityTier } from '../types';

const S = SeverityTier;

/**
 * Categorie Politique. Contient deux chaines — "La Conspiration du Conseil"
 * et "L'Heritier Cache" (3 templates chacune, 2 etapes) — et 6 evenements
 * independants.
 */
export const POLITICS_TEMPLATES: EventTemplate[] = [
  // ---- Chaine : La Conspiration du Conseil ----
  {
    id: 'pol-01',
    category: EventCategory.POLITICS,
    name: 'Rumeurs de complot au Conseil',
    story: 'Des lettres anonymes evoquent un complot ourdi par un membre meme du Conseil.',
    baseConditions: [
      { type: 'ROUND_AT_LEAST', round: 2 },
      { type: 'FLAG_NOT_SET', flag: 'conspiration_resolue' },
    ],
    baseWeight: 3,
    choices: [
      {
        id: 'enqueter',
        label: 'Ordonner une enquete discrete',
        immediateEffects: { stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_enquetee' }, { type: 'ADVANCE_CHAIN', chainId: 'conspiration' }],
      },
      {
        id: 'ignorer',
        label: 'Ignorer les rumeurs',
        immediateEffects: {},
        futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_ignoree' }, { type: 'ADVANCE_CHAIN', chainId: 'conspiration' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Espion', reaction: 'Peut deja savoir qui complote, et contre qui.' },
      { roleCode: 'Maître Chanteur', reaction: 'Peut avoir lui-meme redige les lettres anonymes.' },
    ],
    chain: { chainId: 'conspiration', chainName: 'La Conspiration du Conseil', stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR, S.CRITICAL],
  },
  {
    id: 'pol-02a',
    category: EventCategory.POLITICS,
    name: 'La conspiration exposee',
    story: 'L\'enquete a porte ses fruits : les comploteurs sont identifies.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'conspiration_enquetee' },
      { type: 'FLAG_NOT_SET', flag: 'conspiration_resolue' },
    ],
    baseWeight: 4,
    choices: [
      { id: 'proces', label: 'Proces public des conspirateurs', immediateEffects: { stability: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_resolue' }] },
      {
        id: 'discret',
        label: 'Reglement discret',
        immediateEffects: { treasury: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_resolue' }, { type: 'SET_FLAG', flag: 'conspiration_etouffee' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Inquisiteur', reaction: 'Peut mener l\'instruction avec toute la severite voulue.' },
      { roleCode: 'Agent Double', reaction: 'Risque particulierement d\'etre demasque par cette meme enquete.' },
    ],
    chain: { chainId: 'conspiration', chainName: 'La Conspiration du Conseil', stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'pol-02b',
    category: EventCategory.POLITICS,
    name: "Le complot frappe dans l'ombre",
    story: 'Faute d\'enquete, le complot a eu le temps de murir — et d\'agir.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'conspiration_ignoree' },
      { type: 'FLAG_NOT_SET', flag: 'conspiration_resolue' },
    ],
    baseWeight: 4,
    choices: [
      { id: 'reagir', label: "Reagir en urgence", immediateEffects: { stability: -1, army: 1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_resolue' }] },
      { id: 'subir', label: 'Subir sans reagir', immediateEffects: { stability: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'conspiration_resolue' }] },
    ],
    roleReactions: [
      { roleCode: 'Assassin', reaction: 'Peut avoir ete l\'instrument meme de ce complot.' },
      { roleCode: 'Capitaine de la Garde', reaction: 'Porte la responsabilite d\'avoir laisse faire.' },
    ],
    chain: { chainId: 'conspiration', chainName: 'La Conspiration du Conseil', stage: 2, totalStages: 2 },
    severityAxis: [S.MAJOR, S.CRITICAL],
  },

  // ---- Chaine : L'Heritier Cache ----
  {
    id: 'pol-03',
    category: EventCategory.POLITICS,
    name: "La rumeur d'un heritier cache",
    story: 'Une rumeur insistante evoque un enfant illegitime du defunt Roi, eleve loin de la cour.',
    baseConditions: [
      { type: 'ROUND_AT_LEAST', round: 3 },
      { type: 'FLAG_NOT_SET', flag: 'heritier_resolu' },
    ],
    baseWeight: 2,
    choices: [
      {
        id: 'enqueter',
        label: 'Ouvrir une enquete genealogique',
        immediateEffects: { treasury: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_enquete' }, { type: 'ADVANCE_CHAIN', chainId: 'heritier-cache' }],
      },
      {
        id: 'decourager',
        label: 'Decourager la rumeur',
        immediateEffects: { stability: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_etouffe' }, { type: 'ADVANCE_CHAIN', chainId: 'heritier-cache' }],
      },
    ],
    roleReactions: [
      { roleCode: 'Bâtard Royal', reaction: 'Cette rumeur le concerne peut-etre directement.' },
      { roleCode: 'Moine Copiste', reaction: 'Peut retrouver les registres de naissance pertinents.' },
    ],
    chain: { chainId: 'heritier-cache', chainName: "L'Heritier Cache", stage: 1, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'pol-04a',
    category: EventCategory.POLITICS,
    name: "L'heritier reconnu",
    story: 'L\'enquete a confirme la filiation. Reste a decider de son sort officiel.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'heritier_enquete' },
      { type: 'FLAG_NOT_SET', flag: 'heritier_resolu' },
    ],
    baseWeight: 4,
    choices: [
      {
        id: 'reconnaitre',
        label: "Reconnaitre officiellement l'heritier",
        immediateEffects: { stability: 2 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_resolu' }, { type: 'SET_FLAG', flag: 'heritier_reconnu' }],
      },
      { id: 'rejeter', label: 'Rejeter la pretention', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_resolu' }] },
    ],
    roleReactions: [
      { roleCode: 'Bâtard Royal', reaction: 'Son propre destin se joue directement dans cette decision.' },
      { roleCode: 'Chancelier', reaction: 'Doit verifier la validite legale de cette reconnaissance.' },
    ],
    chain: { chainId: 'heritier-cache', chainName: "L'Heritier Cache", stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'pol-04b',
    category: EventCategory.POLITICS,
    name: "La rumeur s'eteint dans l'ombre",
    story: 'Sans enquete officielle, la rumeur persiste malgre tout, alimentee par quelques temoins genants.',
    baseConditions: [
      { type: 'FLAG_SET', flag: 'heritier_etouffe' },
      { type: 'FLAG_NOT_SET', flag: 'heritier_resolu' },
    ],
    baseWeight: 4,
    choices: [
      { id: 'payer', label: 'Payer le silence des temoins', immediateEffects: { treasury: -2 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_resolu' }] },
      { id: 'laisser', label: 'Laisser la rumeur mourir seule', immediateEffects: {}, futureConsequences: [{ type: 'SET_FLAG', flag: 'heritier_resolu' }] },
    ],
    roleReactions: [
      { roleCode: 'Maître Chanteur', reaction: 'Peut monnayer son propre silence, ou celui des temoins.' },
      { roleCode: 'Espion', reaction: 'Peut savoir exactement qui parle encore de cette histoire.' },
    ],
    chain: { chainId: 'heritier-cache', chainName: "L'Heritier Cache", stage: 2, totalStages: 2 },
    severityAxis: [S.MINOR, S.MAJOR],
  },

  // ---- Evenements independants ----
  {
    id: 'pol-05',
    category: EventCategory.POLITICS,
    name: 'La visite de {lieu}',
    story: 'Une delegation de {lieu} arrive a la cour, avec des attentes protocolaires precises.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 2,
    choices: [
      { id: 'fastueux', label: 'Reserver un accueil fastueux', immediateEffects: { treasury: -1, stability: 1 }, futureConsequences: [] },
      { id: 'minimal', label: 'Accueil minimal', immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Ambassadeur Étranger', reaction: 'Juge cette visite a l\'aune de ses propres interets.' },
      { roleCode: 'Diplomate', reaction: 'Peut transformer cette visite en occasion de negociation.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ["l'Empire du Levant", 'la Republique des Iles', 'la Confederation Grise'],
  },
  {
    id: 'pol-06',
    category: EventCategory.POLITICS,
    name: 'Le scandale de {lieu}',
    story: 'Une liaison compromettante impliquant {lieu} menace d\'eclater au grand jour.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'etouffer', label: 'Etouffer le scandale', immediateEffects: { treasury: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'scandale_etouffe' }] },
      { id: 'laisser', label: 'Laisser eclater la verite', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Maître Chanteur', reaction: 'Detient probablement deja les preuves de ce scandale.' },
      { roleCode: 'Héraut', reaction: 'Sa proclamation peut precipiter — ou retarder — l\'affaire.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['un conseiller haut place', 'une grande maison noble', 'un proche du trone'],
  },
  {
    id: 'pol-07',
    category: EventCategory.POLITICS,
    name: "La demande d'audience d'un paysan",
    story: 'Un simple paysan a parcouru des lieues pour demander audience au Conseil.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 1 }],
    baseWeight: 1,
    choices: [
      { id: 'accorder', label: "Accorder l'audience", immediateEffects: { stability: 1 }, futureConsequences: [] },
      { id: 'refuser', label: 'Refuser, trop occupe', immediateEffects: { stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Bouffon', reaction: 'Peut plaider la cause du paysan avec un humour desarmant.' },
      { roleCode: 'Prince', reaction: 'Une audience accordee renforce son image de souverain proche du peuple.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
  },
  {
    id: 'pol-08',
    category: EventCategory.POLITICS,
    name: 'Le vote truque revele',
    story: 'Des indices troublants suggerent qu\'un recent vote du Conseil a ete manipule.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'annuler', label: 'Annuler le vote et recommencer', immediateEffects: { stability: -1 }, futureConsequences: [{ type: 'SET_FLAG', flag: 'vote_annule' }] },
      { id: 'laisser', label: 'Laisser le resultat en place', immediateEffects: {}, futureConsequences: [{ type: 'SET_FLAG', flag: 'fraude_ignoree' }] },
    ],
    roleReactions: [
      { roleCode: 'Chancelier', reaction: 'Peut avoir lui-meme organise cette manipulation par une faille de procedure.' },
      { roleCode: 'Faussaire', reaction: 'Ses talents seraient parfaitement adaptes a un tel trucage.' },
    ],
    severityAxis: [S.MAJOR, S.CRITICAL],
  },
  {
    id: 'pol-09',
    category: EventCategory.POLITICS,
    name: "L'alliance matrimoniale de {lieu}",
    story: '{lieu} propose une union par mariage pour sceller une alliance durable.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      {
        id: 'accepter',
        label: "Accepter l'union",
        immediateEffects: { army: 1, faith: -1 },
        futureConsequences: [{ type: 'SET_FLAG', flag: 'alliance_matrimoniale' }],
      },
      { id: 'decliner', label: "Decliner l'offre", immediateEffects: {}, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Duc', reaction: 'Peut lui-meme convoiter cette union pour sa propre maison.' },
      { roleCode: 'Ambassadeur Étranger', reaction: 'Suit cette negociation avec un interet qui n\'est pas neutre.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['la Maison de Valcerre', 'la Cour d\'Ambre', 'le Clan du Nord'],
  },
  {
    id: 'pol-10',
    category: EventCategory.POLITICS,
    name: 'La succession contestee de {lieu}',
    story: 'A la mort du Duc, deux heritiers de {lieu} revendiquent chacun le titre.',
    baseConditions: [{ type: 'ROUND_AT_LEAST', round: 2 }],
    baseWeight: 2,
    choices: [
      { id: 'aine', label: "Trancher en faveur de l'aine", immediateEffects: { stability: 1 }, futureConsequences: [] },
      { id: 'diviser', label: 'Diviser le duche entre les heritiers', immediateEffects: { treasury: -1, stability: -1 }, futureConsequences: [] },
    ],
    roleReactions: [
      { roleCode: 'Duc', reaction: 'A un interet direct dans le precedent que cette decision va creer.' },
      { roleCode: 'Chancelier', reaction: 'Doit s\'assurer que la decision respecte les lois de succession.' },
    ],
    severityAxis: [S.MINOR, S.MAJOR],
    contextAxis: ['Varenne', 'Corvile', 'Aubrume'],
  },
];
