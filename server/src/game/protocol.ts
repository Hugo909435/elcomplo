import {
  AccusationRecord,
  GameResult,
  PowerType,
  PrivatePlayerState,
  PublicGameState,
  PublicPowerResolution,
  RoundRecord,
} from '@le-conseil/game-engine';

// ============================================================================
// Protocole Socket.io — noms d'evenements et formes de payloads.
// Le frontend maintient un miroir type de ce fichier (frontend/src/lib/protocol.ts).
// REGLE : tout payload emis en broadcast doit etre construit uniquement a
// partir de donnees publiques ; les payloads prives ne partent que vers le
// socket du joueur concerne.
// ============================================================================

/** Vue "salon" diffusable a tous les membres (aucune info secrete). */
export interface RoomView {
  code: string;
  status: 'LOBBY' | 'PLAYING' | 'ENDED';
  players: Array<{ playerId: string; name: string; isHost: boolean; connected: boolean }>;
  minPlayers: number;
  maxPlayers: number;
}

export interface ChatMessage {
  from: string; // displayName
  playerId: string;
  text: string;
  ts: number;
}

export interface PhasePayload {
  phase: string;
  /** Echeance absolue (epoch ms) du timer serveur de la phase, null si aucune. */
  deadlineTs: number | null;
  roundNumber: number;
}

export interface SessionInfo {
  token: string;
  playerId: string;
  room: RoomView;
}

/** Instantane complet renvoye a la connexion/reconnexion. */
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

export interface ErrorPayload {
  code: string;
  message: string;
}

// ---- client -> serveur ----
export interface CreateRoomDto {
  name: string;
}
export interface JoinRoomDto {
  code: string;
  name: string;
}
export interface ResumeDto {
  token: string;
}
export interface VoteDto {
  optionId: string;
}
export interface PowerDto {
  power: PowerType;
  targetPlayerId?: string;
}
export interface AccuseDto {
  targetPlayerId: string;
}
export interface ChatDto {
  text: string;
}

export const CLIENT_EVENTS = {
  roomCreate: 'room:create',
  roomJoin: 'room:join',
  roomLeave: 'room:leave',
  sessionResume: 'session:resume',
  gameStart: 'game:start',
  gameVote: 'game:vote',
  gamePower: 'game:power',
  gamePassPowers: 'game:passPowers',
  gameAccuse: 'game:accuse',
  gameContinue: 'game:continue',
  chatSend: 'chat:send',
} as const;

export const SERVER_EVENTS = {
  roomUpdate: 'room:update',
  gamePublic: 'game:public',
  gamePrivate: 'game:private',
  gamePhase: 'game:phase',
  gameVoteProgress: 'game:voteProgress',
  gamePowersProgress: 'game:powersProgress',
  gamePowers: 'game:powers',
  gamePowerResult: 'game:powerResult',
  gameAccused: 'game:accused',
  gameRevote: 'game:revote',
  gameRound: 'game:round',
  gameEnd: 'game:end',
  chatMessage: 'chat:message',
  errorEvent: 'game:error',
} as const;

export interface VoteProgressPayload {
  votedCount: number;
  totalPlayers: number;
}

export interface PowersProgressPayload {
  readyCount: number;
  totalPlayers: number;
}

export interface RoundPayload {
  record: RoundRecord;
  resources: Record<string, number>;
  chosenOptionId: string;
  wasTie: boolean;
  wasTieBrokenByRegent: boolean;
  wasChosenByLot: boolean;
  wasForcedByTimeout: boolean;
  abstentions: string[];
  tally: Record<string, number>;
}

export type PowersPayload = PublicPowerResolution;
