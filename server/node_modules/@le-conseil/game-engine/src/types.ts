// ============================================================================
// Types du domaine — aucune dependance a Socket.io, NestJS ou React ici.
// ============================================================================

export enum Allegiance {
  LOYALIST = 'LOYALIST',
  CLAIMANT = 'CLAIMANT',
  FOREIGN_AGENT = 'FOREIGN_AGENT',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  CRISIS = 'CRISIS',
  NEGOTIATION = 'NEGOTIATION',
  POWERS = 'POWERS',
  VOTE = 'VOTE',
  RESOLUTION = 'RESOLUTION',
  GAME_END = 'GAME_END',
}

export enum ResourceKey {
  TREASURY = 'treasury',
  STABILITY = 'stability',
  ARMY = 'army',
  FAITH = 'faith',
}

export enum PowerType {
  SPY_ALLEGIANCE = 'SPY_ALLEGIANCE',
  FORCE_REVOTE = 'FORCE_REVOTE',
  BLOCK_POWER = 'BLOCK_POWER',
  BOOST_REGENT = 'BOOST_REGENT',
}

export enum VictoryType {
  KINGDOM_SURVIVES = 'KINGDOM_SURVIVES',
  CLAIMANT_CROWNED = 'CLAIMANT_CROWNED',
  FOREIGN_AGENT_COLLAPSE = 'FOREIGN_AGENT_COLLAPSE',
  KINGDOM_COLLAPSED_NO_AGENT = 'KINGDOM_COLLAPSED_NO_AGENT',
}

export type ObjectiveDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

// ---- Roles nommes ----

/**
 * Un role nomme lie une allegeance a un pouvoir et a une identite narrative.
 * La table de distribution (roleDistribution.ts) decide combien de joueurs
 * de chaque allegeance existent ; RoleAssigner pioche ensuite un role
 * compatible pour chacun. Le nom du role est prive (revele seulement en fin
 * de partie ou via une accusation reussie -> allegeance seule).
 */
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  allegiance: Allegiance;
  power: PowerType;
  powerUses: number;
}

// ---- Ressources du royaume ----

export type ResourceState = Record<ResourceKey, number>;
export type ResourceDelta = Partial<Record<ResourceKey, number>>;

export interface ResourceBounds {
  min: number;
  max: number;
}

// ---- Contenu : crises ----

export interface CrisisOption {
  id: string;
  label: string;
  effects: ResourceDelta;
  /** Jetons de Soutien gagnes par le Regent si cette option est retenue (mecanique du Pretendant). */
  supportGain?: number;
}

export interface CrisisCard {
  id: string;
  code: string;
  title: string;
  description: string;
  options: CrisisOption[]; // 2 ou 3 options, validees a la construction du deck
}

// ---- Contenu : objectifs secrets (conditions declaratives, evaluees par ObjectiveEvaluator) ----

export type ObjectiveCondition =
  | { type: 'RESOURCE_BELOW'; resource: ResourceKey; value: number }
  | { type: 'RESOURCE_ABOVE'; resource: ResourceKey; value: number }
  | { type: 'REGENT_AT_LEAST'; count: number }
  | { type: 'VOTE_WITH_MAJORITY_AT_LEAST'; count: number }
  | { type: 'VOTE_AGAINST_REGENT_AT_LEAST'; count: number }
  | { type: 'NEVER_USE_POWER' }
  | { type: 'SURVIVE_UNREVEALED' }
  | { type: 'KINGDOM_SURVIVES' }
  | { type: 'KINGDOM_COLLAPSES' };

export interface SecretObjective {
  id: string;
  code: string;
  description: string;
  compatibleAllegiances: Allegiance[] | 'ANY';
  difficulty: ObjectiveDifficulty;
  condition: ObjectiveCondition;
}

// ---- Etat runtime des joueurs (prive, interne au moteur) ----

export interface PlayerPower {
  type: PowerType;
  usesRemaining: number;
}

export interface PlayerStats {
  regentCount: number;
  votesWithMajority: number;
  votesAgainstRegent: number;
  powersUsed: number;
}

export interface PlayerRuntime {
  id: string;
  seatIndex: number;
  displayName: string;
  connected: boolean;
  allegiance: Allegiance;
  roleId: string;
  secretObjectiveId: string;
  supportTokens: number;
  /** Vrai si l'allegeance a ete percee a jour publiquement (affecte les objectifs "SURVIVE_UNREVEALED"). */
  revealed: boolean;
  /** Vrai si le joueur a deja utilise son unique accusation de la partie. */
  hasAccused: boolean;
  powers: PlayerPower[];
  stats: PlayerStats;
}

// ---- Accusations (mecanique publique de demasquage) ----

export type AccusationOutcome = 'REVEALED_AGENT' | 'BACKFIRED';

export interface AccusationRecord {
  roundNumber: number;
  accuserId: string;
  targetId: string;
  outcome: AccusationOutcome;
  /** Allegeance rendue publique par l'accusation (celle de la cible si REVEALED_AGENT, celle de l'accusateur si BACKFIRED). */
  revealedPlayerId: string;
  revealedAllegiance: Allegiance;
}

// ---- Historique ----

export interface PowerActionRecord {
  playerId: string;
  power: PowerType;
  targetPlayerId?: string;
}

export interface RoundRecord {
  roundNumber: number;
  crisisCardId: string;
  regentPlayerId: string;
  votes: Record<string, string>;
  chosenOptionId: string;
  resourceDeltaApplied: ResourceDelta;
  powerActions: PowerActionRecord[];
}

// ---- Configuration ----

export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  totalRounds: number;
  resourceBounds: ResourceBounds;
  startingResources: ResourceState;
  collapseThreshold: number;
  survivalThreshold: number;
  /** Part des manches (arrondie au superieur) que le Pretendant doit avoir "gagnees" comme Regent pour pretendre au trone. */
  claimantSupportThresholdRatio: number;
  /** Impact maximal (valeur absolue) qu'une seule option de crise peut infliger a une ressource. */
  maxSingleCrisisImpact: number;
  negotiationDurationMs: number;
  voteDurationMs: number;
  /** Bareme de points du classement final (voir GameResult.scoreboard). */
  scoring: {
    /** Points gagnes par un joueur dont le camp remporte sa condition de victoire. */
    campVictory: number;
    /** Points gagnes par un joueur qui reussit son objectif secret personnel. */
    objective: number;
  };
}

export interface CreateGameParams {
  players: Array<{ id: string; displayName: string }>;
  config?: Partial<GameConfig>;
  crisisDeck?: CrisisCard[];
  objectivePool?: SecretObjective[];
  /** Pool de roles nommes ; defaut = les 15 roles de content/roles.ts. Les pouvoirs des joueurs decoulent de leur role. */
  rolePool?: RoleDefinition[];
  /** Graine deterministe (tests, replays, audits) ; defaut = horloge systeme. */
  rngSeed?: number;
}

// ---- Etats exposes (vues publique / privee) ----

export interface PublicPlayerView {
  id: string;
  seatIndex: number;
  displayName: string;
  connected: boolean;
  isRegent: boolean;
  hasAccused: boolean;
  revealedAllegiance?: Allegiance;
}

export interface PublicGameState {
  phase: GamePhase;
  roundNumber: number;
  totalRounds: number;
  resources: ResourceState;
  regentPlayerId: string | null;
  currentCrisis?: CrisisCard;
  players: PublicPlayerView[];
}

export interface PrivatePlayerState {
  playerId: string;
  allegiance: Allegiance;
  role: RoleDefinition;
  secretObjective: SecretObjective;
  powers: PlayerPower[];
  supportTokens: number;
  hasAccused: boolean;
  /** Nombre de manches ou ce joueur sera Regent sur l'ensemble de la partie (transparence sur la faisabilite des objectifs). */
  regenciesTotal: number;
  /** Jetons de soutien requis pour la victoire du Pretendant (n'a de sens que pour l'allegeance CLAIMANT). */
  claimantTokensRequired: number;
  /** Pendant un second tour de vote uniquement : l'option votee au premier tour, interdite a la reselection. */
  revoteBlockedOptionId?: string;
}

// ---- Resultat final ----

export interface VictoryRecord {
  type: VictoryType;
  playerIds: string[];
  reason: string;
}

export interface PlayerObjectiveResult {
  playerId: string;
  objectiveId: string;
  achieved: boolean;
}

export interface PlayerFinalRole {
  playerId: string;
  allegiance: Allegiance;
  roleId: string;
  roleName: string;
}

/**
 * Ligne de classement d'un joueur. Le score total departage clairement la
 * partie : le(s) joueur(s) au score maximal (et non nul) sont les gagnants.
 */
export interface PlayerScore {
  playerId: string;
  /** Points de camp (campVictory si le camp du joueur a gagne, 0 sinon). */
  campPoints: number;
  /** Points d'objectif (objective si l'objectif perso est reussi, 0 sinon). */
  objectivePoints: number;
  total: number;
  /** Rang 1-based ; les ex-aequo partagent le meme rang. */
  rank: number;
  /** Vrai pour le(s) meilleur(s) score(s), a condition qu'il soit strictement positif. */
  isWinner: boolean;
}

export interface GameResult {
  kingdomSurvived: boolean;
  collapsedAtRound?: number;
  victories: VictoryRecord[];
  objectiveResults: PlayerObjectiveResult[];
  finalRoles: PlayerFinalRole[];
  /** Classement final trie par score decroissant (source de verite du "qui gagne"). */
  scoreboard: PlayerScore[];
  /** Identifiants des gagnants (meilleur score strictement positif). Vide si personne ne marque. */
  winnerPlayerIds: string[];
}
