// ============================================================================
// Miroir client du protocole serveur (server/src/game/protocol.ts) et des
// types publics du moteur. UNIQUE fichier de types reseau cote client : toute
// evolution du protocole serveur doit etre repercutee ici et nulle part
// ailleurs.
// ============================================================================

export const ResourceKey = {
  TREASURY: 'treasury',
  STABILITY: 'stability',
  ARMY: 'army',
  FAITH: 'faith',
} as const;

export type ResourceKey = (typeof ResourceKey)[keyof typeof ResourceKey];

export type ResourceState = Record<ResourceKey, number>;

export type Allegiance = 'LOYALIST' | 'CLAIMANT' | 'FOREIGN_AGENT';

export type PowerType = 'SPY_ALLEGIANCE' | 'FORCE_REVOTE' | 'BLOCK_POWER' | 'BOOST_REGENT';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'CRISIS'
  | 'NEGOTIATION'
  | 'POWERS'
  | 'VOTE'
  | 'RESOLUTION'
  | 'GAME_END';

export interface CrisisOption {
  id: string;
  label: string;
  effects?: Partial<Record<ResourceKey, number>>;
  supportGain?: number;
}

export interface CrisisCard {
  id: string;
  title: string;
  description: string;
  options: CrisisOption[];
}

export interface PublicPlayerView {
  id: string;
  seatIndex?: number;
  displayName: string;
  connected: boolean;
  isRegent: boolean;
  hasAccused?: boolean;
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

export interface RoleInfo {
  id: string;
  name: string;
  description: string;
  allegiance: Allegiance;
  power: PowerType;
  powerUses: number;
}

export interface SecretObjectiveInfo {
  id: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface PrivatePlayerState {
  playerId: string;
  allegiance: Allegiance;
  role: RoleInfo;
  secretObjective: SecretObjectiveInfo;
  powers: Array<{ type: PowerType; usesRemaining: number }>;
  supportTokens: number;
  hasAccused: boolean;
  regenciesTotal: number;
  claimantTokensRequired: number;
  /** Pendant un second tour uniquement : l'option votée au premier tour, interdite à la resélection. */
  revoteBlockedOptionId?: string;
}

export interface RoomView {
  code: string;
  status: 'LOBBY' | 'PLAYING' | 'ENDED';
  players: Array<{ playerId: string; name: string; isHost: boolean; connected: boolean }>;
  minPlayers: number;
  maxPlayers: number;
}

export interface ChatMessage {
  from: string;
  playerId: string;
  text: string;
  ts: number;
}

export interface PhasePayload {
  phase: GamePhase;
  deadlineTs: number | null;
  roundNumber: number;
}

export interface AccusationRecord {
  roundNumber: number;
  accuserId: string;
  targetId: string;
  outcome: 'REVEALED_AGENT' | 'BACKFIRED';
  revealedPlayerId: string;
  revealedAllegiance: Allegiance;
}

export interface PowerActionRecord {
  playerId: string;
  power: PowerType;
  targetPlayerId?: string;
}

export interface PowersPayload {
  applied: PowerActionRecord[];
  blocked: PowerActionRecord[];
  hiddenActionCount: number;
}

export interface RoundPayload {
  record: {
    roundNumber: number;
    crisisCardId: string;
    regentPlayerId: string;
    votes: Record<string, string>;
    chosenOptionId: string;
  };
  resources: ResourceState;
  chosenOptionId: string;
  wasTie: boolean;
  wasTieBrokenByRegent: boolean;
  wasChosenByLot: boolean;
  wasForcedByTimeout: boolean;
  abstentions: string[];
  tally: Record<string, number>;
}

export interface VictoryRecord {
  type: 'KINGDOM_SURVIVES' | 'CLAIMANT_CROWNED' | 'FOREIGN_AGENT_COLLAPSE' | 'KINGDOM_COLLAPSED_NO_AGENT';
  playerIds: string[];
  reason: string;
}

export interface PlayerScore {
  playerId: string;
  campPoints: number;
  objectivePoints: number;
  total: number;
  rank: number;
  isWinner: boolean;
}

export interface GameResult {
  kingdomSurvived: boolean;
  collapsedAtRound?: number;
  victories: VictoryRecord[];
  objectiveResults: Array<{ playerId: string; objectiveId: string; achieved: boolean }>;
  finalRoles: Array<{ playerId: string; allegiance: Allegiance; roleId: string; roleName: string }>;
  scoreboard: PlayerScore[];
  winnerPlayerIds: string[];
}

export interface VoteProgressPayload {
  votedCount: number;
  totalPlayers: number;
}

export interface PowersProgressPayload {
  readyCount: number;
  totalPlayers: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ResumeSnapshot {
  playerId: string;
  room: RoomView;
  publicState: PublicGameState | null;
  privateState: PrivatePlayerState | null;
  phase: PhasePayload | null;
  chat: ChatMessage[];
  accusations: AccusationRecord[];
  votedCount: number;
  hasVoted: boolean;
  powersReadyCount: number;
  hasPassedPowers: boolean;
  result: GameResult | null;
}

export type SpyResultPayload =
  | { type: 'SPY_RESULT'; targetPlayerId: string; allegiance: Allegiance }
  | { type: 'POWER_BLOCKED'; power: PowerType }
  | { type: 'POWER_FIZZLED'; power: PowerType };
