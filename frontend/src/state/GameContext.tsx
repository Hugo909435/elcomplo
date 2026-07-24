/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { clearSessionToken, emitAck, getSocket, loadSessionToken, saveSessionToken } from '../lib/socket';
import type {
  AccusationRecord,
  ChatMessage,
  ErrorPayload,
  GameResult,
  PhasePayload,
  PowersPayload,
  PowerType,
  PrivatePlayerState,
  PublicGameState,
  ResumeSnapshot,
  RoomView,
  RoundPayload,
  SpyResultPayload,
  PowersProgressPayload,
  VoteProgressPayload,
} from '../types/game';

export interface GameState {
  connection: 'connecting' | 'online' | 'offline';
  resuming: boolean;
  playerId: string | null;
  room: RoomView | null;
  publicState: PublicGameState | null;
  privateState: PrivatePlayerState | null;
  phase: PhasePayload | null;
  chat: ChatMessage[];
  unreadChat: number;
  voteProgress: VoteProgressPayload | null;
  /** Option votee localement pour la manche courante (l'etat serveur reste secret jusqu'a resolution). */
  myVote: string | null;
  /** Vrai pendant un second tour de vote (revote force par un pouvoir). */
  revoteActive: boolean;
  powersProgress: PowersProgressPayload | null;
  /** Vrai si j'ai déjà utilisé mon pouvoir ou passé mon tour cette manche. */
  powersActed: boolean;
  round: RoundPayload | null;
  powers: PowersPayload | null;
  accusations: AccusationRecord[];
  spyResults: SpyResultPayload[];
  result: GameResult | null;
  error: ErrorPayload | null;
}

const INITIAL: GameState = {
  connection: 'connecting',
  resuming: true,
  playerId: null,
  room: null,
  publicState: null,
  privateState: null,
  phase: null,
  chat: [],
  unreadChat: 0,
  voteProgress: null,
  myVote: null,
  revoteActive: false,
  powersProgress: null,
  powersActed: false,
  round: null,
  powers: null,
  accusations: [],
  spyResults: [],
  result: null,
  error: null,
};

type Action =
  | { type: 'connection'; value: GameState['connection'] }
  | { type: 'snapshot'; snapshot: ResumeSnapshot }
  | { type: 'resumeFailed' }
  | { type: 'room'; room: RoomView }
  | { type: 'public'; state: PublicGameState }
  | { type: 'private'; state: PrivatePlayerState }
  | { type: 'phase'; phase: PhasePayload }
  | { type: 'chat'; message: ChatMessage; ownPlayerId: string | null }
  | { type: 'chatRead' }
  | { type: 'voteProgress'; progress: VoteProgressPayload }
  | { type: 'myVote'; optionId: string }
  | { type: 'powersProgress'; progress: PowersProgressPayload }
  | { type: 'powersActed' }
  | { type: 'revote'; deadlineTs: number | null }
  | { type: 'round'; round: RoundPayload }
  | { type: 'powers'; powers: PowersPayload }
  | { type: 'accused'; record: AccusationRecord }
  | { type: 'spyResult'; payload: SpyResultPayload }
  | { type: 'end'; result: GameResult }
  | { type: 'error'; error: ErrorPayload }
  | { type: 'clearError' }
  | { type: 'reset' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'connection':
      return { ...state, connection: action.value };
    case 'snapshot': {
      const s = action.snapshot;
      return {
        ...state,
        resuming: false,
        playerId: s.playerId,
        room: s.room,
        publicState: s.publicState,
        privateState: s.privateState,
        phase: s.phase,
        chat: s.chat,
        accusations: s.accusations,
        voteProgress:
          s.publicState && s.phase?.phase === 'VOTE'
            ? { votedCount: s.votedCount, totalPlayers: s.publicState.players.length }
            : null,
        myVote: s.hasVoted ? state.myVote : null,
        revoteActive: s.phase?.phase === 'VOTE' && !!s.privateState?.revoteBlockedOptionId,
        powersProgress:
          s.publicState && s.phase?.phase === 'POWERS'
            ? { readyCount: s.powersReadyCount, totalPlayers: s.publicState.players.filter((p) => p.connected).length }
            : null,
        powersActed: s.hasPassedPowers,
        result: s.result,
      };
    }
    case 'resumeFailed':
      return { ...INITIAL, connection: state.connection, resuming: false };
    case 'room':
      return { ...state, room: action.room };
    case 'public':
      return { ...state, publicState: action.state };
    case 'private':
      return { ...state, privateState: action.state };
    case 'phase': {
      const next: GameState = { ...state, phase: action.phase };
      if (action.phase.phase === 'CRISIS') {
        // Nouvelle manche : purge des artefacts de la manche precedente.
        next.myVote = null;
        next.round = null;
        next.powers = null;
        next.voteProgress = null;
        next.powersProgress = null;
        next.powersActed = false;
        next.revoteActive = false;
      }
      return next;
    }
    case 'chat': {
      const chat = [...state.chat, action.message].slice(-200);
      const isOwn = action.message.playerId === action.ownPlayerId;
      return { ...state, chat, unreadChat: isOwn ? state.unreadChat : state.unreadChat + 1 };
    }
    case 'chatRead':
      return { ...state, unreadChat: 0 };
    case 'voteProgress':
      return { ...state, voteProgress: action.progress };
    case 'myVote':
      return { ...state, myVote: action.optionId };
    case 'powersProgress':
      return { ...state, powersProgress: action.progress };
    case 'powersActed':
      return { ...state, powersActed: true };
    case 'revote':
      return {
        ...state,
        myVote: null,
        revoteActive: true,
        voteProgress: state.publicState
          ? { votedCount: 0, totalPlayers: state.publicState.players.length }
          : null,
        phase: state.phase ? { ...state.phase, deadlineTs: action.deadlineTs } : state.phase,
      };
    case 'round':
      return { ...state, round: action.round };
    case 'powers':
      return { ...state, powers: action.powers };
    case 'accused':
      return { ...state, accusations: [...state.accusations, action.record] };
    case 'spyResult':
      return { ...state, spyResults: [...state.spyResults, action.payload] };
    case 'end':
      return { ...state, result: action.result };
    case 'error':
      return { ...state, error: action.error };
    case 'clearError':
      return { ...state, error: null };
    case 'reset':
      return { ...INITIAL, connection: state.connection, resuming: false };
    default:
      return state;
  }
}

export interface GameCommands {
  createRoom(name: string): Promise<ErrorPayload | null>;
  joinRoom(code: string, name: string): Promise<ErrorPayload | null>;
  leaveRoom(): Promise<void>;
  startGame(): Promise<ErrorPayload | null>;
  castVote(optionId: string): Promise<ErrorPayload | null>;
  usePower(power: PowerType, targetPlayerId?: string): Promise<ErrorPayload | null>;
  passPowers(): Promise<ErrorPayload | null>;
  accuse(targetPlayerId: string): Promise<ErrorPayload | null>;
  hostContinue(): Promise<ErrorPayload | null>;
  sendChat(text: string): void;
  markChatRead(): void;
  clearError(): void;
}

const StateContext = createContext<GameState>(INITIAL);
const CommandsContext = createContext<GameCommands | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const playerIdRef = useRef<string | null>(null);
  playerIdRef.current = state.playerId;

  useEffect(() => {
    const socket = getSocket();

    const onConnect = async () => {
      dispatch({ type: 'connection', value: 'online' });
      const token = loadSessionToken();
      if (!token) {
        dispatch({ type: 'resumeFailed' });
        return;
      }
      const ack = await emitAck<ResumeSnapshot>('session:resume', { token });
      if (ack.ok && ack.snapshot) {
        dispatch({ type: 'snapshot', snapshot: ack.snapshot });
      } else {
        clearSessionToken();
        dispatch({ type: 'resumeFailed' });
      }
    };
    const onDisconnect = () => dispatch({ type: 'connection', value: 'offline' });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', (room: RoomView) => dispatch({ type: 'room', room }));
    socket.on('game:public', (s: PublicGameState) => dispatch({ type: 'public', state: s }));
    socket.on('game:private', (s: PrivatePlayerState) => dispatch({ type: 'private', state: s }));
    socket.on('game:phase', (phase: PhasePayload) => dispatch({ type: 'phase', phase }));
    socket.on('chat:message', (message: ChatMessage) =>
      dispatch({ type: 'chat', message, ownPlayerId: playerIdRef.current }),
    );
    socket.on('game:voteProgress', (progress: VoteProgressPayload) => dispatch({ type: 'voteProgress', progress }));
    socket.on('game:powersProgress', (progress: PowersProgressPayload) =>
      dispatch({ type: 'powersProgress', progress }),
    );
    socket.on('game:revote', (p: { deadlineTs: number | null }) =>
      dispatch({ type: 'revote', deadlineTs: p?.deadlineTs ?? null }),
    );
    socket.on('game:round', (round: RoundPayload) => dispatch({ type: 'round', round }));
    socket.on('game:powers', (powers: PowersPayload) => dispatch({ type: 'powers', powers }));
    socket.on('game:accused', (record: AccusationRecord) => dispatch({ type: 'accused', record }));
    socket.on('game:powerResult', (payload: SpyResultPayload) => dispatch({ type: 'spyResult', payload }));
    socket.on('game:end', (result: GameResult) => dispatch({ type: 'end', result }));
    socket.on('game:error', (error: ErrorPayload) => dispatch({ type: 'error', error }));

    if (socket.connected) void onConnect();

    return () => {
      socket.off();
    };
  }, []);

  const commands = useMemo<GameCommands>(() => {
    const simple = async (event: string, body?: unknown): Promise<ErrorPayload | null> => {
      const ack = await emitAck(event, body);
      return ack.ok ? null : (ack.error ?? { code: 'UNKNOWN', message: 'Erreur inconnue' });
    };
    return {
      async createRoom(name) {
        const ack = await emitAck<ResumeSnapshot>('room:create', { name });
        if (ack.ok && ack.token && ack.snapshot) {
          saveSessionToken(ack.token);
          dispatch({ type: 'snapshot', snapshot: ack.snapshot });
          return null;
        }
        return ack.error ?? { code: 'UNKNOWN', message: 'Erreur inconnue' };
      },
      async joinRoom(code, name) {
        const ack = await emitAck<ResumeSnapshot>('room:join', { code, name });
        if (ack.ok && ack.token && ack.snapshot) {
          saveSessionToken(ack.token);
          dispatch({ type: 'snapshot', snapshot: ack.snapshot });
          return null;
        }
        return ack.error ?? { code: 'UNKNOWN', message: 'Erreur inconnue' };
      },
      async leaveRoom() {
        await emitAck('room:leave');
        clearSessionToken();
        dispatch({ type: 'reset' });
      },
      startGame: () => simple('game:start'),
      async castVote(optionId) {
        const error = await simple('game:vote', { optionId });
        if (!error) dispatch({ type: 'myVote', optionId });
        return error;
      },
      async usePower(power, targetPlayerId) {
        const error = await simple('game:power', { power, targetPlayerId });
        if (!error) dispatch({ type: 'powersActed' });
        return error;
      },
      async passPowers() {
        const error = await simple('game:passPowers');
        if (!error) dispatch({ type: 'powersActed' });
        return error;
      },
      accuse: (targetPlayerId) => simple('game:accuse', { targetPlayerId }),
      hostContinue: () => simple('game:continue'),
      sendChat(text) {
        void simple('chat:send', { text });
      },
      markChatRead() {
        dispatch({ type: 'chatRead' });
      },
      clearError() {
        dispatch({ type: 'clearError' });
      },
    };
  }, []);

  return (
    <StateContext.Provider value={state}>
      <CommandsContext.Provider value={commands}>{children}</CommandsContext.Provider>
    </StateContext.Provider>
  );
}

export function useGameState(): GameState {
  return useContext(StateContext);
}

export function useGameCommands(): GameCommands {
  const commands = useContext(CommandsContext);
  if (!commands) throw new Error('useGameCommands doit etre utilise sous <GameProvider>');
  return commands;
}

/** Compte a rebours base sur une echeance absolue serveur — robuste aux re-render et aux onglets endormis. */
export function useCountdown(deadlineTs: number | null): number {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (deadlineTs === null) return;
    const interval = setInterval(force, 500);
    return () => clearInterval(interval);
  }, [deadlineTs]);
  if (deadlineTs === null) return 0;
  return Math.max(0, Math.ceil((deadlineTs - Date.now()) / 1000));
}
