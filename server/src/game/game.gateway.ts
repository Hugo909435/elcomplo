import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PowerType } from '@le-conseil/game-engine';
import { Server, Socket } from 'socket.io';
import {
  AccuseDto,
  ChatDto,
  CreateRoomDto,
  ErrorPayload,
  JoinRoomDto,
  PowerDto,
  ResumeDto,
  VoteDto,
} from './protocol';
import { RoomError, RoomManager } from './room.manager';

const MAX_MESSAGES_PER_WINDOW = 30;
const RATE_WINDOW_MS = 5_000;

interface SocketMeta {
  token: string | null;
  windowStart: number;
  messageCount: number;
}

/**
 * Traduction Socket.io <-> RoomManager. AUCUNE regle de jeu ici : validation
 * de surface des payloads, rate limiting, association socket/session, et
 * transport des evenements. Toute erreur metier redescend au client en
 * 'game:error' — jamais en exception non geree.
 */
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? true } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private meta = new Map<string, SocketMeta>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly rooms: RoomManager) {}

  afterInit(server: Server): void {
    this.rooms.setEmitter({
      toRoom: (code, event, payload) => server.to(this.channel(code)).emit(event, payload),
      toSocket: (socketId, event, payload) => server.to(socketId).emit(event, payload),
    });
  }

  handleConnection(socket: Socket): void {
    this.meta.set(socket.id, { token: null, windowStart: Date.now(), messageCount: 0 });
  }

  handleDisconnect(socket: Socket): void {
    this.meta.delete(socket.id);
    this.rooms.detachSocket(socket.id);
  }

  // ==========================================================================
  // Salon
  // ==========================================================================

  @SubscribeMessage('room:create')
  onRoomCreate(@ConnectedSocket() socket: Socket, @MessageBody() body: CreateRoomDto) {
    return this.guard(socket, () => {
      const session = this.rooms.createRoom(this.str(body?.name, 40));
      this.bindSession(socket, session.token, session.room.code);
      const snapshot = this.rooms.attachSocket(session.token, socket.id);
      return { ok: true, token: session.token, snapshot };
    });
  }

  @SubscribeMessage('room:join')
  onRoomJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinRoomDto) {
    return this.guard(socket, () => {
      const session = this.rooms.joinRoom(this.str(body?.code, 12), this.str(body?.name, 40));
      this.bindSession(socket, session.token, session.room.code);
      const snapshot = this.rooms.attachSocket(session.token, socket.id);
      return { ok: true, token: session.token, snapshot };
    });
  }

  @SubscribeMessage('session:resume')
  onResume(@ConnectedSocket() socket: Socket, @MessageBody() body: ResumeDto) {
    return this.guard(socket, () => {
      const token = this.str(body?.token, 64);
      const snapshot = this.rooms.attachSocket(token, socket.id);
      this.bindSession(socket, token, snapshot.room.code);
      return { ok: true, token, snapshot };
    });
  }

  @SubscribeMessage('room:leave')
  onLeave(@ConnectedSocket() socket: Socket) {
    return this.guard(socket, () => {
      const token = this.tokenOf(socket);
      this.rooms.leaveRoom(token);
      const meta = this.meta.get(socket.id);
      if (meta) meta.token = null;
      for (const channel of [...socket.rooms]) {
        if (channel.startsWith('room:')) void socket.leave(channel);
      }
      return { ok: true };
    });
  }

  // ==========================================================================
  // Partie
  // ==========================================================================

  @SubscribeMessage('game:start')
  onGameStart(@ConnectedSocket() socket: Socket) {
    return this.guard(socket, () => {
      this.rooms.startGame(this.tokenOf(socket));
      return { ok: true };
    });
  }

  @SubscribeMessage('game:vote')
  onVote(@ConnectedSocket() socket: Socket, @MessageBody() body: VoteDto) {
    return this.guard(socket, () => {
      this.rooms.castVote(this.tokenOf(socket), this.str(body?.optionId, 32));
      return { ok: true };
    });
  }

  @SubscribeMessage('game:power')
  onPower(@ConnectedSocket() socket: Socket, @MessageBody() body: PowerDto) {
    return this.guard(socket, () => {
      const power = this.str(body?.power, 32) as PowerType;
      if (!Object.values(PowerType).includes(power)) {
        throw new RoomError('INVALID_PAYLOAD', 'Pouvoir inconnu');
      }
      const target = body?.targetPlayerId === undefined ? undefined : this.str(body.targetPlayerId, 64);
      this.rooms.usePower(this.tokenOf(socket), power, target);
      return { ok: true };
    });
  }

  @SubscribeMessage('game:passPowers')
  onPassPowers(@ConnectedSocket() socket: Socket) {
    return this.guard(socket, () => {
      this.rooms.passPowers(this.tokenOf(socket));
      return { ok: true };
    });
  }

  @SubscribeMessage('game:accuse')
  onAccuse(@ConnectedSocket() socket: Socket, @MessageBody() body: AccuseDto) {
    return this.guard(socket, () => {
      this.rooms.accuse(this.tokenOf(socket), this.str(body?.targetPlayerId, 64));
      return { ok: true };
    });
  }

  @SubscribeMessage('game:continue')
  onContinue(@ConnectedSocket() socket: Socket) {
    return this.guard(socket, () => {
      this.rooms.hostContinue(this.tokenOf(socket));
      return { ok: true };
    });
  }

  @SubscribeMessage('chat:send')
  onChat(@ConnectedSocket() socket: Socket, @MessageBody() body: ChatDto) {
    return this.guard(socket, () => {
      this.rooms.sendChat(this.tokenOf(socket), this.str(body?.text, 400));
      return { ok: true };
    });
  }

  // ==========================================================================
  // Aides
  // ==========================================================================

  private channel(code: string): string {
    return `room:${code}`;
  }

  private bindSession(socket: Socket, token: string, roomCode: string): void {
    const meta = this.meta.get(socket.id);
    if (meta) meta.token = token;
    void socket.join(this.channel(roomCode));
  }

  private tokenOf(socket: Socket): string {
    const token = this.meta.get(socket.id)?.token;
    if (!token) throw new RoomError('NOT_IN_SESSION', "Aucune session active sur cette connexion");
    return token;
  }

  /** Validation de surface : toute entree client est une chaine bornee, sinon rejet. */
  private str(value: unknown, maxLength: number): string {
    if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
      throw new RoomError('INVALID_PAYLOAD', 'Payload invalide');
    }
    return value;
  }

  /**
   * Enveloppe commune : rate limiting + conversion des erreurs metier en
   * reponse ack { ok: false } et evenement 'game:error'. Un client hostile
   * ne peut ni crasher le process ni distinguer une erreur interne.
   */
  private guard<T>(socket: Socket, action: () => T): T | { ok: false; error: ErrorPayload } {
    const meta = this.meta.get(socket.id);
    if (meta) {
      const now = Date.now();
      if (now - meta.windowStart > RATE_WINDOW_MS) {
        meta.windowStart = now;
        meta.messageCount = 0;
      }
      meta.messageCount += 1;
      if (meta.messageCount > MAX_MESSAGES_PER_WINDOW) {
        const error: ErrorPayload = { code: 'RATE_LIMITED', message: 'Trop de requetes, ralentis' };
        return { ok: false, error };
      }
    }

    try {
      return action();
    } catch (error) {
      if (error instanceof RoomError) {
        const payload: ErrorPayload = { code: error.code, message: error.message };
        socket.emit('game:error', payload);
        return { ok: false, error: payload };
      }
      this.logger.error(`Erreur inattendue: ${(error as Error).stack}`);
      const payload: ErrorPayload = { code: 'INTERNAL', message: 'Erreur interne' };
      socket.emit('game:error', payload);
      return { ok: false, error: payload };
    }
  }
}
