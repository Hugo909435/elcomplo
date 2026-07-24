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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Durees de phase raccourcies AVANT tout import du serveur (lues au chargement du module).
// POUVOIRS est volontairement LONG : ainsi, si la partie se termine vite dans le
// test de partie complete, c'est que le mecanisme "passer" fait bien avancer la
// phase (et non le timer). Si "passer" etait casse, le test expirerait.
process.env.PHASE_CRISIS_MS = '120';
process.env.PHASE_NEGOTIATION_MS = '150';
process.env.PHASE_POWERS_MS = '30000';
process.env.PHASE_VOTE_MS = '400';
process.env.PHASE_RESOLUTION_MS = '120';
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const socket_io_client_1 = require("socket.io-client");
let app;
let url;
const openSockets = [];
(0, node_test_1.before)(async () => {
    const { NestFactory } = await Promise.resolve().then(() => __importStar(require('@nestjs/core')));
    const { AppModule } = await Promise.resolve().then(() => __importStar(require('../app.module')));
    app = await NestFactory.create(AppModule, { logger: ['error'] });
    await app.listen(0);
    const address = app.getHttpServer().address();
    url = `http://127.0.0.1:${address.port}`;
});
(0, node_test_1.after)(async () => {
    for (const socket of openSockets)
        socket.disconnect();
    await app.close();
});
function connect() {
    return new Promise((resolve, reject) => {
        const socket = (0, socket_io_client_1.io)(url, { transports: ['websocket'], forceNew: true });
        openSockets.push(socket);
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
    });
}
function emit(socket, event, body) {
    return new Promise((resolve) => socket.emit(event, body ?? {}, (response) => resolve(response)));
}
function waitFor(socket, event, timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout en attendant ${event}`)), timeoutMs);
        socket.once(event, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}
(0, node_test_1.describe)('Integration — serveur Le Conseil', () => {
    (0, node_test_1.it)('rejette les commandes sans session et les codes de salon inconnus', async () => {
        const socket = await connect();
        const voteAck = await emit(socket, 'game:vote', { optionId: 'a' });
        strict_1.default.equal(voteAck.ok, false);
        strict_1.default.equal(voteAck.error.code, 'NOT_IN_SESSION');
        const joinAck = await emit(socket, 'room:join', { code: 'ZZZZZZ', name: 'Intrus' });
        strict_1.default.equal(joinAck.ok, false);
        strict_1.default.equal(joinAck.error.code, 'ROOM_NOT_FOUND');
        const badName = await emit(socket, 'room:create', { name: 'x' });
        strict_1.default.equal(badName.ok, false);
        strict_1.default.equal(badName.error.code, 'INVALID_NAME');
        socket.disconnect();
    });
    (0, node_test_1.it)('joue une partie complete a 3 joueurs : lobby, roles prives, votes, fin — sans fuite d\'info privee', async () => {
        const [alice, bob, carol] = await Promise.all([connect(), connect(), connect()]);
        // --- Creation et jonction ---
        const created = await emit(alice, 'room:create', { name: 'Alice' });
        strict_1.default.equal(created.ok, true);
        const code = created.snapshot.room.code;
        strict_1.default.match(code, /^[A-Z2-9]{6}$/);
        const joinedBob = await emit(bob, 'room:join', { code, name: 'Bob' });
        const joinedCarol = await emit(carol, 'room:join', { code: code.toLowerCase(), name: 'Carol' });
        strict_1.default.equal(joinedBob.ok, true);
        strict_1.default.equal(joinedCarol.ok, true, 'le code de salon doit etre insensible a la casse');
        // Un non-hote ne peut pas lancer.
        const notHost = await emit(bob, 'game:start');
        strict_1.default.equal(notHost.ok, false);
        strict_1.default.equal(notHost.error.code, 'NOT_HOST');
        const clients = [
            { name: 'Alice', socket: alice, playerId: created.snapshot.playerId },
            { name: 'Bob', socket: bob, playerId: joinedBob.snapshot.playerId },
            { name: 'Carol', socket: carol, playerId: joinedCarol.snapshot.playerId },
        ];
        // --- Instrumentation : chaque client enregistre ce qu'il recoit ---
        const privateStates = new Map();
        const privacyViolations = [];
        const publicLeaks = [];
        const endResults = new Map();
        for (const client of clients) {
            client.socket.on('game:private', (state) => {
                if (state.playerId !== client.playerId) {
                    privacyViolations.push(`${client.name} a recu l'etat prive de ${state.playerId}`);
                }
                privateStates.set(client.playerId, state);
            });
            client.socket.on('game:powers', (payload) => {
                const all = [...(payload.applied ?? []), ...(payload.blocked ?? [])];
                if (all.some((a) => a.power === 'SPY_ALLEGIANCE')) {
                    publicLeaks.push('action SPY_ALLEGIANCE diffusee publiquement');
                }
            });
            client.socket.on('game:public', (state) => {
                for (const p of state.players ?? []) {
                    if ('allegiance' in p || 'secretObjective' in p || 'roleId' in p) {
                        publicLeaks.push(`champ secret dans l'etat public: ${JSON.stringify(p)}`);
                    }
                }
            });
            client.socket.on('game:end', (result) => endResults.set(client.playerId, result));
            // Voter des que la phase VOTE s'ouvre (ou re-ouvre) : premiere option de la crise courante.
            let currentOptions = [];
            client.socket.on('game:crisis', () => { });
            client.socket.on('game:public', (state) => {
                if (state.currentCrisis)
                    currentOptions = state.currentCrisis.options.map((o) => o.id);
            });
            client.socket.on('game:phase', (phase) => {
                if (phase.phase === 'VOTE' && currentOptions.length > 0) {
                    void emit(client.socket, 'game:vote', { optionId: currentOptions[0] });
                }
                // Phase POUVOIRS : chacun passe son tour → doit faire avancer au vote
                // sans attendre le timer de 30 s (sinon le test expirerait).
                if (phase.phase === 'POWERS') {
                    void emit(client.socket, 'game:passPowers');
                }
            });
            client.socket.on('game:revote', () => {
                if (currentOptions.length > 0) {
                    void emit(client.socket, 'game:vote', { optionId: currentOptions[0] });
                }
            });
        }
        // --- Lancement ---
        const endPromises = clients.map((c) => waitFor(c.socket, 'game:end', 60_000));
        const started = await emit(alice, 'game:start');
        strict_1.default.equal(started.ok, true);
        const results = await Promise.all(endPromises);
        // --- Assertions finales ---
        strict_1.default.deepEqual(privacyViolations, [], privacyViolations.join(' | '));
        strict_1.default.deepEqual(publicLeaks, [], publicLeaks.join(' | '));
        for (const result of results) {
            strict_1.default.equal(result.objectiveResults.length, 3);
            strict_1.default.equal(result.finalRoles.length, 3);
            // Le classement (scoreboard) est bien transmis au client via game:end.
            strict_1.default.equal(result.scoreboard.length, 3, 'classement transmis pour les 3 joueurs');
            strict_1.default.ok(Array.isArray(result.winnerPlayerIds), 'liste des gagnants transmise');
            for (const row of result.scoreboard) {
                strict_1.default.equal(row.total, row.campPoints + row.objectivePoints);
            }
        }
        // Chaque joueur a recu SON etat prive avec un role nomme.
        strict_1.default.equal(privateStates.size, 3);
        for (const client of clients) {
            const priv = privateStates.get(client.playerId);
            strict_1.default.ok(priv, `${client.name} n'a jamais recu d'etat prive`);
            strict_1.default.ok(priv.role?.name?.length > 0);
            strict_1.default.ok(priv.secretObjective?.description?.length > 0);
        }
        // Les 3 allegeances privees sont coherentes avec une partie a 3 joueurs (1 Pretendant, 0 Agent).
        const allegiances = clients.map((c) => privateStates.get(c.playerId).allegiance).sort();
        strict_1.default.deepEqual(allegiances.filter((a) => a === 'CLAIMANT').length, 1, `allegeances recues: ${allegiances.join(', ')}`);
    });
    (0, node_test_1.it)('permet la reconnexion en cours de partie avec restitution complete de l\'etat', async () => {
        const [host, p2, p3] = await Promise.all([connect(), connect(), connect()]);
        const created = await emit(host, 'room:create', { name: 'Hote' });
        const code = created.snapshot.room.code;
        const j2 = await emit(p2, 'room:join', { code, name: 'Fidele' });
        await emit(p3, 'room:join', { code, name: 'Troisieme' });
        const tokenP2 = j2.token;
        const playerIdP2 = j2.snapshot.playerId;
        await emit(host, 'game:start');
        // Attendre que la partie soit reellement en cours.
        await waitFor(host, 'game:phase');
        // P2 ferme son navigateur...
        p2.disconnect();
        await new Promise((r) => setTimeout(r, 200));
        // ... et revient avec son token de session.
        const p2bis = await connect();
        const resumed = await emit(p2bis, 'session:resume', { token: tokenP2 });
        strict_1.default.equal(resumed.ok, true);
        strict_1.default.equal(resumed.snapshot.playerId, playerIdP2);
        strict_1.default.ok(resumed.snapshot.publicState, 'etat public restitue');
        strict_1.default.equal(resumed.snapshot.privateState.playerId, playerIdP2, 'etat prive restitue');
        strict_1.default.ok(resumed.snapshot.phase.phase.length > 0);
        // Un token bidon est rejete.
        const stranger = await connect();
        const bad = await emit(stranger, 'session:resume', { token: 'token-bidon-000' });
        strict_1.default.equal(bad.ok, false);
        strict_1.default.equal(bad.error.code, 'SESSION_UNKNOWN');
    });
    (0, node_test_1.it)('la phase Pouvoirs s\'ouvre au vote dès que tous ont passé, sans attendre le timer (30 s)', async () => {
        const [host, p2, p3] = await Promise.all([connect(), connect(), connect()]);
        const created = await emit(host, 'room:create', { name: 'Hôte' });
        const code = created.snapshot.room.code;
        await emit(p2, 'room:join', { code, name: 'Deux' });
        await emit(p3, 'room:join', { code, name: 'Trois' });
        const all = [host, p2, p3];
        // Attendre l'arrivée en phase POWERS (crise 120ms + négociation 150ms via timers).
        function waitForPhase(socket, target) {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`pas de phase ${target}`)), 20_000);
                const handler = (phase) => {
                    if (phase.phase === target) {
                        clearTimeout(timer);
                        socket.off('game:phase', handler);
                        resolve();
                    }
                };
                socket.on('game:phase', handler);
            });
        }
        const reachedPowers = waitForPhase(host, 'POWERS');
        await emit(host, 'game:start');
        await reachedPowers;
        // Suivre le compteur de préparation diffusé.
        let lastProgress = null;
        host.on('game:powersProgress', (p) => (lastProgress = p));
        const voteOpened = waitForPhase(host, 'VOTE');
        const tStart = Date.now();
        for (const s of all)
            await emit(s, 'game:passPowers');
        await voteOpened;
        const elapsed = Date.now() - tStart;
        strict_1.default.ok(elapsed < 3000, `le vote a mis ${elapsed}ms à s'ouvrir : le "passer" n'a pas court-circuité le timer`);
        strict_1.default.ok(lastProgress, 'un compteur de préparation a été diffusé');
        strict_1.default.equal(lastProgress.totalPlayers, 3);
    });
    (0, node_test_1.it)('applique le rate limiting sur un client qui spamme', async () => {
        const socket = await connect();
        let limited = false;
        for (let i = 0; i < 40; i++) {
            const ack = await emit(socket, 'room:join', { code: 'AAAAAA', name: 'Spammeur' });
            if (ack.error?.code === 'RATE_LIMITED') {
                limited = true;
                break;
            }
        }
        strict_1.default.equal(limited, true, 'le rate limiting doit finir par se declencher');
        socket.disconnect();
    });
});
//# sourceMappingURL=integration.test.js.map