// Durees de phase raccourcies AVANT tout import du serveur (lues au chargement du module).
// POUVOIRS est volontairement LONG : ainsi, si la partie se termine vite dans le
// test de partie complete, c'est que le mecanisme "passer" fait bien avancer la
// phase (et non le timer). Si "passer" etait casse, le test expirerait.
process.env.PHASE_CRISIS_MS = '120';
process.env.PHASE_NEGOTIATION_MS = '150';
process.env.PHASE_POWERS_MS = '30000';
process.env.PHASE_VOTE_MS = '400';
process.env.PHASE_RESOLUTION_MS = '120';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';

interface Ack {
  ok: boolean;
  token?: string;
  snapshot?: any;
  error?: { code: string; message: string };
}

let app: INestApplication;
let url: string;
const openSockets: Socket[] = [];

before(async () => {
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../app.module');
  app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.listen(0);
  const address = app.getHttpServer().address() as AddressInfo;
  url = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  for (const socket of openSockets) socket.disconnect();
  await app.close();
});

function connect(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    openSockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function emit(socket: Socket, event: string, body?: unknown): Promise<Ack> {
  return new Promise((resolve) => socket.emit(event, body ?? {}, (response: Ack) => resolve(response)));
}

function waitFor<T>(socket: Socket, event: string, timeoutMs = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout en attendant ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Integration — serveur Le Conseil', () => {
  it('rejette les commandes sans session et les codes de salon inconnus', async () => {
    const socket = await connect();
    const voteAck = await emit(socket, 'game:vote', { optionId: 'a' });
    assert.equal(voteAck.ok, false);
    assert.equal(voteAck.error!.code, 'NOT_IN_SESSION');

    const joinAck = await emit(socket, 'room:join', { code: 'ZZZZZZ', name: 'Intrus' });
    assert.equal(joinAck.ok, false);
    assert.equal(joinAck.error!.code, 'ROOM_NOT_FOUND');

    const badName = await emit(socket, 'room:create', { name: 'x' });
    assert.equal(badName.ok, false);
    assert.equal(badName.error!.code, 'INVALID_NAME');
    socket.disconnect();
  });

  it('joue une partie complete a 3 joueurs : lobby, roles prives, votes, fin — sans fuite d\'info privee', async () => {
    const [alice, bob, carol] = await Promise.all([connect(), connect(), connect()]);

    // --- Creation et jonction ---
    const created = await emit(alice, 'room:create', { name: 'Alice' });
    assert.equal(created.ok, true);
    const code = created.snapshot.room.code as string;
    assert.match(code, /^[A-Z2-9]{6}$/);

    const joinedBob = await emit(bob, 'room:join', { code, name: 'Bob' });
    const joinedCarol = await emit(carol, 'room:join', { code: code.toLowerCase(), name: 'Carol' });
    assert.equal(joinedBob.ok, true);
    assert.equal(joinedCarol.ok, true, 'le code de salon doit etre insensible a la casse');

    // Un non-hote ne peut pas lancer.
    const notHost = await emit(bob, 'game:start');
    assert.equal(notHost.ok, false);
    assert.equal(notHost.error!.code, 'NOT_HOST');

    const clients = [
      { name: 'Alice', socket: alice, playerId: created.snapshot.playerId as string },
      { name: 'Bob', socket: bob, playerId: joinedBob.snapshot.playerId as string },
      { name: 'Carol', socket: carol, playerId: joinedCarol.snapshot.playerId as string },
    ];

    // --- Instrumentation : chaque client enregistre ce qu'il recoit ---
    const privateStates = new Map<string, any>();
    const privacyViolations: string[] = [];
    const publicLeaks: string[] = [];
    const endResults = new Map<string, any>();

    for (const client of clients) {
      client.socket.on('game:private', (state: any) => {
        if (state.playerId !== client.playerId) {
          privacyViolations.push(`${client.name} a recu l'etat prive de ${state.playerId}`);
        }
        privateStates.set(client.playerId, state);
      });
      client.socket.on('game:powers', (payload: any) => {
        const all = [...(payload.applied ?? []), ...(payload.blocked ?? [])];
        if (all.some((a: any) => a.power === 'SPY_ALLEGIANCE')) {
          publicLeaks.push('action SPY_ALLEGIANCE diffusee publiquement');
        }
      });
      client.socket.on('game:public', (state: any) => {
        for (const p of state.players ?? []) {
          if ('allegiance' in p || 'secretObjective' in p || 'roleId' in p) {
            publicLeaks.push(`champ secret dans l'etat public: ${JSON.stringify(p)}`);
          }
        }
      });
      client.socket.on('game:end', (result: any) => endResults.set(client.playerId, result));
      // Voter des que la phase VOTE s'ouvre (ou re-ouvre) : premiere option de la crise courante.
      let currentOptions: string[] = [];
      client.socket.on('game:crisis', () => {});
      client.socket.on('game:public', (state: any) => {
        if (state.currentCrisis) currentOptions = state.currentCrisis.options.map((o: any) => o.id);
      });
      client.socket.on('game:phase', (phase: any) => {
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
    const endPromises = clients.map((c) => waitFor<any>(c.socket, 'game:end', 60_000));
    const started = await emit(alice, 'game:start');
    assert.equal(started.ok, true);

    const results = await Promise.all(endPromises);

    // --- Assertions finales ---
    assert.deepEqual(privacyViolations, [], privacyViolations.join(' | '));
    assert.deepEqual(publicLeaks, [], publicLeaks.join(' | '));

    for (const result of results) {
      assert.equal(result.objectiveResults.length, 3);
      assert.equal(result.finalRoles.length, 3);
      // Le classement (scoreboard) est bien transmis au client via game:end.
      assert.equal(result.scoreboard.length, 3, 'classement transmis pour les 3 joueurs');
      assert.ok(Array.isArray(result.winnerPlayerIds), 'liste des gagnants transmise');
      for (const row of result.scoreboard) {
        assert.equal(row.total, row.campPoints + row.objectivePoints);
      }
    }

    // Chaque joueur a recu SON etat prive avec un role nomme.
    assert.equal(privateStates.size, 3);
    for (const client of clients) {
      const priv = privateStates.get(client.playerId);
      assert.ok(priv, `${client.name} n'a jamais recu d'etat prive`);
      assert.ok(priv.role?.name?.length > 0);
      assert.ok(priv.secretObjective?.description?.length > 0);
    }

    // Les 3 allegeances privees sont coherentes avec une partie a 3 joueurs (1 Pretendant, 0 Agent).
    const allegiances = clients.map((c) => privateStates.get(c.playerId).allegiance).sort();
    assert.deepEqual(
      allegiances.filter((a: string) => a === 'CLAIMANT').length,
      1,
      `allegeances recues: ${allegiances.join(', ')}`,
    );
  });

  it('permet la reconnexion en cours de partie avec restitution complete de l\'etat', async () => {
    const [host, p2, p3] = await Promise.all([connect(), connect(), connect()]);
    const created = await emit(host, 'room:create', { name: 'Hote' });
    const code = created.snapshot.room.code as string;
    const j2 = await emit(p2, 'room:join', { code, name: 'Fidele' });
    await emit(p3, 'room:join', { code, name: 'Troisieme' });

    const tokenP2 = j2.token!;
    const playerIdP2 = j2.snapshot.playerId as string;

    await emit(host, 'game:start');
    // Attendre que la partie soit reellement en cours.
    await waitFor(host, 'game:phase');

    // P2 ferme son navigateur...
    p2.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // ... et revient avec son token de session.
    const p2bis = await connect();
    const resumed = await emit(p2bis, 'session:resume', { token: tokenP2 });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.snapshot.playerId, playerIdP2);
    assert.ok(resumed.snapshot.publicState, 'etat public restitue');
    assert.equal(resumed.snapshot.privateState.playerId, playerIdP2, 'etat prive restitue');
    assert.ok(resumed.snapshot.phase.phase.length > 0);

    // Un token bidon est rejete.
    const stranger = await connect();
    const bad = await emit(stranger, 'session:resume', { token: 'token-bidon-000' });
    assert.equal(bad.ok, false);
    assert.equal(bad.error!.code, 'SESSION_UNKNOWN');
  });

  it('la phase Pouvoirs s\'ouvre au vote dès que tous ont passé, sans attendre le timer (30 s)', async () => {
    const [host, p2, p3] = await Promise.all([connect(), connect(), connect()]);
    const created = await emit(host, 'room:create', { name: 'Hôte' });
    const code = created.snapshot.room.code as string;
    await emit(p2, 'room:join', { code, name: 'Deux' });
    await emit(p3, 'room:join', { code, name: 'Trois' });
    const all = [host, p2, p3];

    // Attendre l'arrivée en phase POWERS (crise 120ms + négociation 150ms via timers).
    function waitForPhase(socket: Socket, target: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`pas de phase ${target}`)), 20_000);
        const handler = (phase: any) => {
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
    let lastProgress: any = null;
    host.on('game:powersProgress', (p: any) => (lastProgress = p));

    const voteOpened = waitForPhase(host, 'VOTE');
    const tStart = Date.now();
    for (const s of all) await emit(s, 'game:passPowers');
    await voteOpened;
    const elapsed = Date.now() - tStart;

    assert.ok(elapsed < 3000, `le vote a mis ${elapsed}ms à s'ouvrir : le "passer" n'a pas court-circuité le timer`);
    assert.ok(lastProgress, 'un compteur de préparation a été diffusé');
    assert.equal(lastProgress.totalPlayers, 3);
  });

  it('applique le rate limiting sur un client qui spamme', async () => {
    const socket = await connect();
    let limited = false;
    for (let i = 0; i < 40; i++) {
      const ack = await emit(socket, 'room:join', { code: 'AAAAAA', name: 'Spammeur' });
      if (ack.error?.code === 'RATE_LIMITED') {
        limited = true;
        break;
      }
    }
    assert.equal(limited, true, 'le rate limiting doit finir par se declencher');
    socket.disconnect();
  });
});
