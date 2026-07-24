"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RoomManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = exports.RoomError = exports.PHASE_DURATIONS_MS = void 0;
const common_1 = require("@nestjs/common");
const game_engine_1 = require("@le-conseil/game-engine");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
// Alphabet sans caracteres ambigus (pas de O/0, I/1/L) pour des codes de
// salon dictables a voix haute. 6 caracteres sur 31 symboles ~ 887 millions
// de combinaisons : l'enumeration par force brute est traitee par le rate
// limiting du gateway, pas par la longueur seule.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_CHAT_LENGTH = 300;
const MAX_NAME_LENGTH = 24;
const CHAT_HISTORY_LIMIT = 200;
/** Durees des phases pilotees par le serveur (ms), surchargeables par env pour les tests. */
exports.PHASE_DURATIONS_MS = {
    crisis: Number(process.env.PHASE_CRISIS_MS ?? 8_000),
    negotiation: Number(process.env.PHASE_NEGOTIATION_MS ?? 90_000),
    powers: Number(process.env.PHASE_POWERS_MS ?? 30_000),
    vote: Number(process.env.PHASE_VOTE_MS ?? 25_000),
    resolution: Number(process.env.PHASE_RESOLUTION_MS ?? 12_000),
};
const ROOM_IDLE_TTL_MS = 3 * 60 * 60 * 1000; // 3 h sans activite -> purge
const ENDED_ROOM_TTL_MS = 30 * 60 * 1000; // partie finie conservee 30 min
class RoomError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.RoomError = RoomError;
/**
 * Gestion des salons et orchestration moteur <-> reseau.
 *
 * CONCURRENCE : toutes les methodes sont synchrones et Node est
 * mono-thread ; chaque commande joueur est donc atomique vis-a-vis du
 * moteur, sans verrou explicite. Aucune methode de cette classe ne doit
 * devenir async au milieu d'une mutation du moteur.
 *
 * CONFIDENTIALITE : seuls les evenements listes comme prives (voir
 * GameEngine, contrat de confidentialite) partent en toSocket ; tout le
 * reste est broadcast au salon.
 */
let RoomManager = RoomManager_1 = class RoomManager {
    constructor() {
        this.logger = new common_1.Logger(RoomManager_1.name);
        this.rooms = new Map();
        this.byToken = new Map();
        this.emitter = null;
        this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 10 * 60 * 1000);
        this.cleanupInterval.unref();
    }
    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
        for (const room of this.rooms.values()) {
            if (room.phaseTimer)
                clearTimeout(room.phaseTimer);
        }
    }
    setEmitter(emitter) {
        this.emitter = emitter;
    }
    // ==========================================================================
    // Salon : creation / jonction / depart / reprise
    // ==========================================================================
    createRoom(hostName) {
        const name = this.sanitizeName(hostName);
        let code = this.generateCode();
        while (this.rooms.has(code))
            code = this.generateCode();
        const player = {
            playerId: (0, node_crypto_1.randomUUID)(),
            name,
            token: (0, node_crypto_1.randomUUID)(),
            socketId: null,
            isHost: true,
        };
        const room = {
            code,
            status: 'LOBBY',
            players: [player],
            engine: null,
            phaseTimer: null,
            phaseDeadlineTs: null,
            chat: [],
            accusations: [],
            votedThisRound: new Set(),
            powersReadyThisRound: new Set(),
            result: null,
            lastActivityTs: Date.now(),
        };
        this.rooms.set(code, room);
        this.byToken.set(player.token, { room, player });
        this.logger.log(`Salon ${code} cree par ${name}`);
        return { token: player.token, playerId: player.playerId, room: this.toRoomView(room) };
    }
    joinRoom(code, playerName) {
        const room = this.rooms.get(this.normalizeCode(code));
        if (!room)
            throw new RoomError('ROOM_NOT_FOUND', 'Salon introuvable — verifie le code');
        if (room.status !== 'LOBBY')
            throw new RoomError('GAME_ALREADY_STARTED', 'La partie a deja commence');
        if (room.players.length >= 8)
            throw new RoomError('ROOM_FULL', 'Le salon est complet (8 joueurs max)');
        const name = this.sanitizeName(playerName);
        if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
            throw new RoomError('NAME_TAKEN', 'Ce nom est deja pris dans ce salon');
        }
        const player = {
            playerId: (0, node_crypto_1.randomUUID)(),
            name,
            token: (0, node_crypto_1.randomUUID)(),
            socketId: null,
            isHost: false,
        };
        room.players.push(player);
        room.lastActivityTs = Date.now();
        this.byToken.set(player.token, { room, player });
        this.broadcastRoom(room);
        return { token: player.token, playerId: player.playerId, room: this.toRoomView(room) };
    }
    /** Associe un socket a une session (connexion initiale comme reconnexion). */
    attachSocket(token, socketId) {
        const session = this.byToken.get(token);
        if (!session)
            throw new RoomError('SESSION_UNKNOWN', 'Session inconnue ou expiree');
        const { room, player } = session;
        player.socketId = socketId;
        room.lastActivityTs = Date.now();
        if (room.engine && room.status === 'PLAYING') {
            room.engine.setPlayerConnected(player.playerId, true);
        }
        this.broadcastRoom(room);
        if (room.engine && room.status !== 'LOBBY') {
            this.emitter?.toRoom(room.code, 'game:public', room.engine.getPublicState());
        }
        return this.buildSnapshot(room, player);
    }
    detachSocket(socketId) {
        for (const room of this.rooms.values()) {
            const player = room.players.find((p) => p.socketId === socketId);
            if (!player)
                continue;
            player.socketId = null;
            room.lastActivityTs = Date.now();
            if (room.status === 'LOBBY') {
                // Dans le lobby, un depart est definitif (la session peut recreer un join).
                this.removeFromLobby(room, player);
            }
            else if (room.status === 'PLAYING' && room.engine) {
                room.engine.setPlayerConnected(player.playerId, false);
                this.broadcastRoom(room);
                this.emitter?.toRoom(room.code, 'game:public', room.engine.getPublicState());
                // Une déconnexion pendant la phase POUVOIRS peut compléter le quorum
                // des joueurs restants : on ré-évalue pour ne pas bloquer sur un absent.
                this.maybeAdvancePowers(room);
            }
            return;
        }
    }
    leaveRoom(token) {
        const session = this.byToken.get(token);
        if (!session)
            return;
        const { room, player } = session;
        if (room.status === 'LOBBY') {
            this.removeFromLobby(room, player);
            this.byToken.delete(token);
        }
        else if (room.status === 'PLAYING' && room.engine) {
            // En partie, "quitter" = deconnexion volontaire : le siege reste, les
            // regles le traitent en abstention permanente.
            room.engine.setPlayerConnected(player.playerId, false);
            player.socketId = null;
            this.broadcastRoom(room);
            this.emitter?.toRoom(room.code, 'game:public', room.engine.getPublicState());
            this.maybeAdvancePowers(room);
        }
    }
    removeFromLobby(room, player) {
        room.players = room.players.filter((p) => p.playerId !== player.playerId);
        this.byToken.delete(player.token);
        if (room.players.length === 0) {
            this.deleteRoom(room);
            return;
        }
        if (player.isHost) {
            room.players[0].isHost = true;
        }
        this.broadcastRoom(room);
    }
    // ==========================================================================
    // Partie : demarrage et commandes joueurs
    // ==========================================================================
    startGame(token) {
        const { room, player } = this.requireSession(token);
        if (!player.isHost)
            throw new RoomError('NOT_HOST', "Seul l'hote peut lancer la partie");
        if (room.status !== 'LOBBY')
            throw new RoomError('GAME_ALREADY_STARTED', 'La partie a deja commence');
        const connectedPlayers = room.players.filter((p) => p.socketId !== null);
        if (connectedPlayers.length < 3) {
            throw new RoomError('NOT_ENOUGH_PLAYERS', 'Il faut au moins 3 joueurs connectes');
        }
        // Les joueurs du lobby jamais connectes sont ecartes au lancement.
        for (const ghost of room.players.filter((p) => p.socketId === null)) {
            this.byToken.delete(ghost.token);
        }
        room.players = connectedPlayers;
        const engine = game_engine_1.GameEngine.create({
            players: room.players.map((p) => ({ id: p.playerId, displayName: p.name })),
        });
        room.engine = engine;
        room.status = 'PLAYING';
        room.lastActivityTs = Date.now();
        this.wireEngineEvents(room, engine);
        engine.start();
        this.broadcastRoom(room);
    }
    castVote(token, optionId) {
        const { room, player } = this.requirePlaying(token);
        this.runEngineCommand(room, () => room.engine.castVote(player.playerId, optionId));
        room.votedThisRound.add(player.playerId);
        // Resolution anticipee : inutile d'attendre le timer si tout le monde a vote.
        if (room.engine.allConnectedPlayersVoted()) {
            this.clearPhaseTimer(room);
            this.runEngineCommand(room, () => room.engine.resolveVotes(false));
        }
    }
    usePower(token, power, targetPlayerId) {
        const { room, player } = this.requirePlaying(token);
        this.runEngineCommand(room, () => room.engine.usePower(player.playerId, power, targetPlayerId));
        // Confirmation privee immediate (l'effet reel arrive a la resolution).
        if (player.socketId) {
            this.emitter?.toSocket(player.socketId, 'game:private', room.engine.getPrivateStateFor(player.playerId));
        }
        // Un pouvoir utilisé = ce joueur en a fini avec la phase POUVOIRS.
        this.markPowersReady(room, player.playerId);
    }
    /**
     * Le joueur passe son tour de pouvoir. Dès que tous les joueurs connectés
     * ont utilisé leur pouvoir ou passé, on ouvre le vote sans attendre le
     * timer — la phase POUVOIRS ne s'éternise plus quand personne n'agit.
     */
    passPowers(token) {
        const { room } = this.requirePlaying(token);
        if (room.engine.getPhase() !== game_engine_1.GamePhase.POWERS) {
            throw new RoomError('WRONG_PHASE', "Ce n'est pas la phase des pouvoirs");
        }
        const { player } = this.requirePlaying(token);
        this.markPowersReady(room, player.playerId);
    }
    markPowersReady(room, playerId) {
        if (room.engine.getPhase() !== game_engine_1.GamePhase.POWERS)
            return;
        room.powersReadyThisRound.add(playerId);
        this.emitPowersProgress(room);
        this.maybeAdvancePowers(room);
    }
    /** Ouvre le vote si tous les joueurs connectés ont terminé la phase des pouvoirs. */
    maybeAdvancePowers(room) {
        if (!room.engine || room.engine.getPhase() !== game_engine_1.GamePhase.POWERS)
            return;
        const connected = room.engine.getPublicState().players.filter((p) => p.connected);
        if (connected.length === 0)
            return;
        const allReady = connected.every((p) => room.powersReadyThisRound.has(p.id));
        if (allReady) {
            this.clearPhaseTimer(room);
            this.runEngineCommand(room, () => room.engine.forceAdvance()); // POWERS -> VOTE
        }
    }
    emitPowersProgress(room) {
        const connected = room.engine.getPublicState().players.filter((p) => p.connected).length;
        this.emitter?.toRoom(room.code, 'game:powersProgress', {
            readyCount: room.powersReadyThisRound.size,
            totalPlayers: connected,
        });
    }
    accuse(token, targetPlayerId) {
        const { room, player } = this.requirePlaying(token);
        this.runEngineCommand(room, () => room.engine.accuse(player.playerId, targetPlayerId));
    }
    /** L'hote peut ecourter les phases de lecture (CRISIS, RESOLUTION) — jamais un vote ou la negociation des autres. */
    hostContinue(token) {
        const { room, player } = this.requirePlaying(token);
        if (!player.isHost)
            throw new RoomError('NOT_HOST', "Seul l'hote peut accelerer la partie");
        const phase = room.engine.getPhase();
        if (phase !== game_engine_1.GamePhase.CRISIS && phase !== game_engine_1.GamePhase.RESOLUTION) {
            throw new RoomError('PHASE_NOT_SKIPPABLE', 'Cette phase ne peut pas etre ecourtee');
        }
        this.clearPhaseTimer(room);
        this.runEngineCommand(room, () => room.engine.forceAdvance());
    }
    sendChat(token, text) {
        const { room, player } = this.requireSession(token);
        const trimmed = String(text ?? '').trim().slice(0, MAX_CHAT_LENGTH);
        if (!trimmed)
            return;
        const message = { from: player.name, playerId: player.playerId, text: trimmed, ts: Date.now() };
        room.chat.push(message);
        if (room.chat.length > CHAT_HISTORY_LIMIT)
            room.chat.shift();
        room.lastActivityTs = Date.now();
        this.emitter?.toRoom(room.code, 'chat:message', message);
    }
    // ==========================================================================
    // Cablage moteur -> reseau
    // ==========================================================================
    wireEngineEvents(room, engine) {
        const code = room.code;
        const emit = (event, payload) => this.emitter?.toRoom(code, event, payload);
        const emitPrivate = (playerId, event, payload) => {
            const target = room.players.find((p) => p.playerId === playerId);
            if (target?.socketId)
                this.emitter?.toSocket(target.socketId, event, payload);
        };
        engine.on('privateRoleAssigned', ({ playerId }) => {
            emitPrivate(playerId, 'game:private', engine.getPrivateStateFor(playerId));
        });
        engine.on('phaseChanged', ({ phase }) => {
            this.schedulePhaseTimer(room, phase);
            emit('game:phase', this.buildPhasePayload(room));
            emit('game:public', engine.getPublicState());
            if (phase === game_engine_1.GamePhase.CRISIS) {
                room.votedThisRound = new Set();
                room.powersReadyThisRound = new Set();
            }
            if (phase === game_engine_1.GamePhase.POWERS) {
                // Nouvelle phase POUVOIRS : réinitialise l'état "prêt" et diffuse le compteur.
                room.powersReadyThisRound = new Set();
                this.emitPowersProgress(room);
            }
        });
        engine.on('voteCast', ({ votedCount }) => {
            emit('game:voteProgress', { votedCount, totalPlayers: room.players.length });
        });
        engine.on('voteForcedRevote', () => {
            room.votedThisRound = new Set();
            // La phase reste VOTE : on rearme le timer manuellement.
            this.schedulePhaseTimer(room, game_engine_1.GamePhase.VOTE);
            emit('game:revote', { deadlineTs: room.phaseDeadlineTs });
            emit('game:voteProgress', { votedCount: 0, totalPlayers: room.players.length });
            // Chaque joueur recoit son etat prive a jour : il y trouve l'option qu'il
            // ne peut pas reprendre (revoteBlockedOptionId), sans la reveler aux autres.
            for (const p of room.players) {
                emitPrivate(p.playerId, 'game:private', engine.getPrivateStateFor(p.playerId));
            }
        });
        engine.on('powersResolved', (payload) => {
            emit('game:powers', payload);
        });
        engine.on('privatePowerResult', ({ playerId, payload }) => {
            emitPrivate(playerId, 'game:powerResult', payload);
            emitPrivate(playerId, 'game:private', engine.getPrivateStateFor(playerId));
        });
        engine.on('playerAccused', ({ record }) => {
            room.accusations.push(record);
            emit('game:accused', record);
            emit('game:public', engine.getPublicState());
        });
        engine.on('roundResolved', ({ record, resources, resolution }) => {
            const payload = {
                record,
                resources,
                chosenOptionId: resolution.chosenOptionId,
                wasTie: resolution.wasTie,
                wasTieBrokenByRegent: resolution.wasTieBrokenByRegent,
                wasChosenByLot: resolution.wasChosenByLot,
                wasForcedByTimeout: resolution.wasForcedByTimeout,
                abstentions: resolution.abstentions,
                tally: resolution.tally,
            };
            emit('game:round', payload);
            // Les jetons de soutien du Regent ont pu changer : etat prive a jour pour tous.
            for (const p of room.players) {
                emitPrivate(p.playerId, 'game:private', engine.getPrivateStateFor(p.playerId));
            }
        });
        engine.on('gameEnded', ({ result }) => {
            room.status = 'ENDED';
            room.result = result;
            this.clearPhaseTimer(room);
            emit('game:end', result);
            this.broadcastRoom(room);
            void this.archiveGame(room, result);
        });
    }
    // ==========================================================================
    // Timers de phase
    // ==========================================================================
    phaseDurationMs(phase) {
        switch (phase) {
            case game_engine_1.GamePhase.CRISIS:
                return exports.PHASE_DURATIONS_MS.crisis;
            case game_engine_1.GamePhase.NEGOTIATION:
                return exports.PHASE_DURATIONS_MS.negotiation;
            case game_engine_1.GamePhase.POWERS:
                return exports.PHASE_DURATIONS_MS.powers;
            case game_engine_1.GamePhase.VOTE:
                return exports.PHASE_DURATIONS_MS.vote;
            case game_engine_1.GamePhase.RESOLUTION:
                return exports.PHASE_DURATIONS_MS.resolution;
            default:
                return null;
        }
    }
    schedulePhaseTimer(room, phase) {
        this.clearPhaseTimer(room);
        const duration = this.phaseDurationMs(phase);
        if (duration === null || !room.engine) {
            room.phaseDeadlineTs = null;
            return;
        }
        room.phaseDeadlineTs = Date.now() + duration;
        room.phaseTimer = setTimeout(() => {
            room.phaseTimer = null;
            if (!room.engine || room.engine.isGameOver())
                return;
            try {
                room.engine.forceAdvance();
            }
            catch (error) {
                // Ne doit jamais arriver (le moteur garantit forceAdvance sans throw
                // en phase de jeu) — loggue et re-tente au tick suivant plutot que de
                // laisser la partie geler silencieusement.
                this.logger.error(`Salon ${room.code}: forceAdvance a echoue: ${error.stack}`);
                this.schedulePhaseTimer(room, room.engine.getPhase());
            }
        }, duration);
    }
    clearPhaseTimer(room) {
        if (room.phaseTimer) {
            clearTimeout(room.phaseTimer);
            room.phaseTimer = null;
        }
        room.phaseDeadlineTs = null;
    }
    // ==========================================================================
    // Aides
    // ==========================================================================
    /** Toute commande moteur passe ici : erreurs metier convertries en RoomError, jamais de crash de process. */
    runEngineCommand(room, command) {
        room.lastActivityTs = Date.now();
        try {
            command();
        }
        catch (error) {
            if (error instanceof game_engine_1.GameEngineError) {
                throw new RoomError(error.code, error.message);
            }
            this.logger.error(`Salon ${room.code}: erreur moteur inattendue: ${error.stack}`);
            throw new RoomError('INTERNAL', 'Erreur interne du serveur de jeu');
        }
    }
    requireSession(token) {
        const session = this.byToken.get(token);
        if (!session)
            throw new RoomError('SESSION_UNKNOWN', 'Session inconnue ou expiree');
        return session;
    }
    requirePlaying(token) {
        const session = this.requireSession(token);
        if (session.room.status !== 'PLAYING' || !session.room.engine) {
            throw new RoomError('GAME_NOT_RUNNING', "La partie n'est pas en cours");
        }
        return session;
    }
    buildPhasePayload(room) {
        const state = room.engine.getPublicState();
        return { phase: state.phase, deadlineTs: room.phaseDeadlineTs, roundNumber: state.roundNumber };
    }
    buildSnapshot(room, player) {
        const engine = room.engine;
        const inGame = engine !== null && room.status !== 'LOBBY';
        const publicState = inGame ? engine.getPublicState() : null;
        const isSeated = inGame && publicState.players.some((p) => p.id === player.playerId);
        return {
            playerId: player.playerId,
            room: this.toRoomView(room),
            publicState,
            privateState: isSeated ? engine.getPrivateStateFor(player.playerId) : null,
            phase: inGame ? this.buildPhasePayload(room) : null,
            chat: room.chat.slice(-50),
            accusations: room.accusations.slice(),
            votedCount: room.votedThisRound.size,
            hasVoted: room.votedThisRound.has(player.playerId),
            powersReadyCount: room.powersReadyThisRound.size,
            hasPassedPowers: room.powersReadyThisRound.has(player.playerId),
            result: room.result,
        };
    }
    toRoomView(room) {
        return {
            code: room.code,
            status: room.status,
            players: room.players.map((p) => ({
                playerId: p.playerId,
                name: p.name,
                isHost: p.isHost,
                connected: p.socketId !== null,
            })),
            minPlayers: 3,
            maxPlayers: 8,
        };
    }
    broadcastRoom(room) {
        this.emitter?.toRoom(room.code, 'room:update', this.toRoomView(room));
    }
    sanitizeName(raw) {
        const name = String(raw ?? '')
            .replace(/[<>\u0000-\u001f]/g, '')
            .trim()
            .slice(0, MAX_NAME_LENGTH);
        if (name.length < 2)
            throw new RoomError('INVALID_NAME', 'Le nom doit faire entre 2 et 24 caracteres');
        return name;
    }
    normalizeCode(raw) {
        return String(raw ?? '').trim().toUpperCase();
    }
    generateCode() {
        let code = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += CODE_ALPHABET[(0, node_crypto_1.randomInt)(CODE_ALPHABET.length)];
        }
        return code;
    }
    deleteRoom(room) {
        this.clearPhaseTimer(room);
        for (const p of room.players)
            this.byToken.delete(p.token);
        this.rooms.delete(room.code);
    }
    cleanupStaleRooms() {
        const now = Date.now();
        for (const room of [...this.rooms.values()]) {
            const idle = now - room.lastActivityTs;
            if ((room.status === 'ENDED' && idle > ENDED_ROOM_TTL_MS) ||
                idle > ROOM_IDLE_TTL_MS ||
                (room.status === 'LOBBY' && room.players.length === 0)) {
                this.logger.log(`Purge du salon ${room.code} (statut ${room.status}, inactif ${Math.round(idle / 60000)} min)`);
                this.deleteRoom(room);
            }
        }
    }
    /** Archive JSONL des parties terminees (historique + audit). Echec non bloquant. */
    async archiveGame(room, result) {
        try {
            const dir = path.resolve(process.cwd(), 'data');
            await (0, promises_1.mkdir)(dir, { recursive: true });
            const line = JSON.stringify({
                code: room.code,
                endedAt: new Date().toISOString(),
                players: room.players.map((p) => ({ playerId: p.playerId, name: p.name })),
                result,
                history: room.engine?.getRoundHistory() ?? [],
                accusations: room.accusations,
            });
            await (0, promises_1.appendFile)(path.join(dir, 'games.jsonl'), line + '\n', 'utf8');
        }
        catch (error) {
            this.logger.warn(`Archivage de la partie ${room.code} impossible: ${error.message}`);
        }
    }
};
exports.RoomManager = RoomManager;
exports.RoomManager = RoomManager = RoomManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RoomManager);
//# sourceMappingURL=room.manager.js.map