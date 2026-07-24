"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GameGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const game_engine_1 = require("@le-conseil/game-engine");
const socket_io_1 = require("socket.io");
const room_manager_1 = require("./room.manager");
const MAX_MESSAGES_PER_WINDOW = 30;
const RATE_WINDOW_MS = 5_000;
/**
 * Traduction Socket.io <-> RoomManager. AUCUNE regle de jeu ici : validation
 * de surface des payloads, rate limiting, association socket/session, et
 * transport des evenements. Toute erreur metier redescend au client en
 * 'game:error' — jamais en exception non geree.
 */
let GameGateway = GameGateway_1 = class GameGateway {
    constructor(rooms) {
        this.rooms = rooms;
        this.logger = new common_1.Logger(GameGateway_1.name);
        this.meta = new Map();
    }
    afterInit(server) {
        this.rooms.setEmitter({
            toRoom: (code, event, payload) => server.to(this.channel(code)).emit(event, payload),
            toSocket: (socketId, event, payload) => server.to(socketId).emit(event, payload),
        });
    }
    handleConnection(socket) {
        this.meta.set(socket.id, { token: null, windowStart: Date.now(), messageCount: 0 });
    }
    handleDisconnect(socket) {
        this.meta.delete(socket.id);
        this.rooms.detachSocket(socket.id);
    }
    // ==========================================================================
    // Salon
    // ==========================================================================
    onRoomCreate(socket, body) {
        return this.guard(socket, () => {
            const session = this.rooms.createRoom(this.str(body?.name, 40));
            this.bindSession(socket, session.token, session.room.code);
            const snapshot = this.rooms.attachSocket(session.token, socket.id);
            return { ok: true, token: session.token, snapshot };
        });
    }
    onRoomJoin(socket, body) {
        return this.guard(socket, () => {
            const session = this.rooms.joinRoom(this.str(body?.code, 12), this.str(body?.name, 40));
            this.bindSession(socket, session.token, session.room.code);
            const snapshot = this.rooms.attachSocket(session.token, socket.id);
            return { ok: true, token: session.token, snapshot };
        });
    }
    onResume(socket, body) {
        return this.guard(socket, () => {
            const token = this.str(body?.token, 64);
            const snapshot = this.rooms.attachSocket(token, socket.id);
            this.bindSession(socket, token, snapshot.room.code);
            return { ok: true, token, snapshot };
        });
    }
    onLeave(socket) {
        return this.guard(socket, () => {
            const token = this.tokenOf(socket);
            this.rooms.leaveRoom(token);
            const meta = this.meta.get(socket.id);
            if (meta)
                meta.token = null;
            for (const channel of [...socket.rooms]) {
                if (channel.startsWith('room:'))
                    void socket.leave(channel);
            }
            return { ok: true };
        });
    }
    // ==========================================================================
    // Partie
    // ==========================================================================
    onGameStart(socket) {
        return this.guard(socket, () => {
            this.rooms.startGame(this.tokenOf(socket));
            return { ok: true };
        });
    }
    onVote(socket, body) {
        return this.guard(socket, () => {
            this.rooms.castVote(this.tokenOf(socket), this.str(body?.optionId, 32));
            return { ok: true };
        });
    }
    onPower(socket, body) {
        return this.guard(socket, () => {
            const power = this.str(body?.power, 32);
            if (!Object.values(game_engine_1.PowerType).includes(power)) {
                throw new room_manager_1.RoomError('INVALID_PAYLOAD', 'Pouvoir inconnu');
            }
            const target = body?.targetPlayerId === undefined ? undefined : this.str(body.targetPlayerId, 64);
            this.rooms.usePower(this.tokenOf(socket), power, target);
            return { ok: true };
        });
    }
    onPassPowers(socket) {
        return this.guard(socket, () => {
            this.rooms.passPowers(this.tokenOf(socket));
            return { ok: true };
        });
    }
    onAccuse(socket, body) {
        return this.guard(socket, () => {
            this.rooms.accuse(this.tokenOf(socket), this.str(body?.targetPlayerId, 64));
            return { ok: true };
        });
    }
    onContinue(socket) {
        return this.guard(socket, () => {
            this.rooms.hostContinue(this.tokenOf(socket));
            return { ok: true };
        });
    }
    onChat(socket, body) {
        return this.guard(socket, () => {
            this.rooms.sendChat(this.tokenOf(socket), this.str(body?.text, 400));
            return { ok: true };
        });
    }
    // ==========================================================================
    // Aides
    // ==========================================================================
    channel(code) {
        return `room:${code}`;
    }
    bindSession(socket, token, roomCode) {
        const meta = this.meta.get(socket.id);
        if (meta)
            meta.token = token;
        void socket.join(this.channel(roomCode));
    }
    tokenOf(socket) {
        const token = this.meta.get(socket.id)?.token;
        if (!token)
            throw new room_manager_1.RoomError('NOT_IN_SESSION', "Aucune session active sur cette connexion");
        return token;
    }
    /** Validation de surface : toute entree client est une chaine bornee, sinon rejet. */
    str(value, maxLength) {
        if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
            throw new room_manager_1.RoomError('INVALID_PAYLOAD', 'Payload invalide');
        }
        return value;
    }
    /**
     * Enveloppe commune : rate limiting + conversion des erreurs metier en
     * reponse ack { ok: false } et evenement 'game:error'. Un client hostile
     * ne peut ni crasher le process ni distinguer une erreur interne.
     */
    guard(socket, action) {
        const meta = this.meta.get(socket.id);
        if (meta) {
            const now = Date.now();
            if (now - meta.windowStart > RATE_WINDOW_MS) {
                meta.windowStart = now;
                meta.messageCount = 0;
            }
            meta.messageCount += 1;
            if (meta.messageCount > MAX_MESSAGES_PER_WINDOW) {
                const error = { code: 'RATE_LIMITED', message: 'Trop de requetes, ralentis' };
                return { ok: false, error };
            }
        }
        try {
            return action();
        }
        catch (error) {
            if (error instanceof room_manager_1.RoomError) {
                const payload = { code: error.code, message: error.message };
                socket.emit('game:error', payload);
                return { ok: false, error: payload };
            }
            this.logger.error(`Erreur inattendue: ${error.stack}`);
            const payload = { code: 'INTERNAL', message: 'Erreur interne' };
            socket.emit('game:error', payload);
            return { ok: false, error: payload };
        }
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:create'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onRoomCreate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onRoomJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('session:resume'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onResume", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onGameStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:vote'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onVote", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:power'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onPower", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:passPowers'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onPassPowers", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:accuse'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onAccuse", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:continue'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onContinue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "onChat", null);
exports.GameGateway = GameGateway = GameGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: process.env.CORS_ORIGIN ?? true } }),
    __metadata("design:paramtypes", [room_manager_1.RoomManager])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map