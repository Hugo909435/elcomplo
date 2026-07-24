import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GameEngine, PublicPowerResolution } from '../engine/GameEngine';
import {
  AccusationRecord,
  Allegiance,
  CrisisCard,
  GamePhase,
  GameResult,
  PowerType,
  VictoryType,
} from '../types';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, displayName: `Joueur ${i}` }));
}

/** Paquet artificiel : l'option 'a' est douce, 'b' rapporte du soutien, 'c' est destructrice. */
function makeDeck(size: number, opts?: { collapseFast?: boolean }): CrisisCard[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `t-crisis-${i}`,
    code: `TEST_${i}`,
    title: `Crise ${i}`,
    description: 'Crise de test',
    options: [
      { id: 'a', label: 'Douce', effects: { stability: 1, treasury: -1 } },
      {
        id: 'b',
        label: 'Soutien',
        // Alternance : derive nette nulle sur la partie, le royaume survit
        // si la table vote 'b' en continu (necessaire au test du Pretendant).
        effects: i % 2 === 0 ? { faith: 1, army: -1 } : { army: 1, faith: -1 },
        supportGain: 1,
      },
      { id: 'c', label: 'Dure', effects: opts?.collapseFast ? { treasury: -3, stability: -3 } : { treasury: -2 } },
    ],
  }));
}

function findByAllegiance(engine: GameEngine, playerIds: string[], allegiance: Allegiance): string | undefined {
  return playerIds.find((id) => engine.getPrivateStateFor(id).allegiance === allegiance);
}

function playFullGame(engine: GameEngine, voteFor?: (round: number) => string): GameResult {
  if (engine.getPublicState().phase === GamePhase.LOBBY) {
    engine.start();
  }
  let guard = 0;
  while (!engine.isGameOver()) {
    if (++guard > 500) throw new Error('Partie non terminee apres 500 avancements : boucle infinie');
    const phase = engine.getPublicState().phase;
    if (phase === GamePhase.VOTE && voteFor) {
      const state = engine.getPublicState();
      for (const p of state.players) {
        engine.castVote(p.id, voteFor(state.roundNumber));
      }
      engine.resolveVotes();
    } else {
      engine.forceAdvance();
    }
  }
  return engine.getFinalResult();
}

describe('GameEngine — cycle de vie', () => {
  for (let n = 3; n <= 8; n++) {
    it(`une partie a ${n} joueurs se termine toujours, sur 25 graines, meme sans aucun vote`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const engine = GameEngine.create({ players: makePlayers(n), rngSeed: seed });
        const result = playFullGame(engine);
        assert.equal(engine.isGameOver(), true);
        assert.equal(result.objectiveResults.length, n);
        assert.equal(result.finalRoles.length, n);
        for (const role of result.finalRoles) {
          assert.ok(role.roleName.length > 0, 'chaque joueur a un role nomme en fin de partie');
        }
        // Les ressources restent bornees.
        const resources = engine.getPublicState().resources;
        for (const value of Object.values(resources)) {
          assert.ok(value >= 0 && value <= 10, `ressource hors bornes: ${value}`);
        }
      }
    });
  }

  it('ajuste totalRounds au nombre de joueurs : chaque siege est Regent au moins une fois a 8 joueurs', () => {
    const engine = GameEngine.create({ players: makePlayers(8), rngSeed: 7 });
    assert.equal(engine.config.totalRounds, 8);
    playFullGame(engine);
    const history = engine.getRoundHistory();
    const regents = new Set(history.map((r) => r.regentPlayerId));
    assert.equal(regents.size, 8, 'les 8 joueurs doivent avoir preside au moins une manche');
  });
});

describe('GameEngine — victoire du Pretendant (regression G1)', () => {
  it('le Pretendant PEUT etre couronne quand la table vote ses options de soutien', () => {
    // Toute la table vote 'b' (supportGain 1) a chaque manche : chaque Regent
    // accumule 1 jeton par mandat, donc le Pretendant atteint exactement son
    // seuil par siege. Avant le correctif, le seuil global (5) etait
    // inatteignable (3 jetons max) : ce test echouait.
    const engine = GameEngine.create({
      players: makePlayers(3),
      crisisDeck: makeDeck(9),
      rngSeed: 11,
    });
    const claimantId = findByAllegiance(engine, ['p0', 'p1', 'p2'], Allegiance.CLAIMANT);
    assert.ok(claimantId, 'il y a toujours un Pretendant a 3 joueurs');

    const priv = engine.getPrivateStateFor(claimantId!);
    assert.ok(priv.claimantTokensRequired <= priv.regenciesTotal, 'le seuil doit etre atteignable');

    const result = playFullGame(engine, () => 'b');
    const crowned = result.victories.find((v) => v.type === VictoryType.CLAIMANT_CROWNED);
    assert.ok(crowned, `CLAIMANT_CROWNED absent des victoires: ${JSON.stringify(result.victories)}`);
    assert.deepEqual(crowned!.playerIds, [claimantId]);
  });
});

describe('GameEngine — classement final (scoreboard)', () => {
  it('produit un classement coherent : camp=2pts, objectif=1pt, gagnants = meilleur score positif', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const engine = GameEngine.create({ players: makePlayers(5), rngSeed: seed });
      const result = playFullGame(engine, () => 'b');

      assert.equal(result.scoreboard.length, 5);

      // Chaque ligne est coherente avec les victoires et objectifs.
      const campWinners = new Set(result.victories.flatMap((v) => v.playerIds));
      const objAchievers = new Set(result.objectiveResults.filter((o) => o.achieved).map((o) => o.playerId));
      for (const row of result.scoreboard) {
        assert.equal(row.campPoints, campWinners.has(row.playerId) ? 2 : 0);
        assert.equal(row.objectivePoints, objAchievers.has(row.playerId) ? 1 : 0);
        assert.equal(row.total, row.campPoints + row.objectivePoints);
        assert.ok(row.rank >= 1 && row.rank <= 5);
      }

      // Le classement est trie par score decroissant.
      for (let i = 1; i < result.scoreboard.length; i++) {
        assert.ok(result.scoreboard[i - 1].total >= result.scoreboard[i].total);
      }

      // Les gagnants = exactement le(s) meilleur(s) score(s), et seulement si > 0.
      const maxTotal = Math.max(...result.scoreboard.map((s) => s.total));
      if (maxTotal > 0) {
        const expectedWinners = result.scoreboard.filter((s) => s.total === maxTotal).map((s) => s.playerId).sort();
        assert.deepEqual([...result.winnerPlayerIds].sort(), expectedWinners);
        for (const row of result.scoreboard) {
          assert.equal(row.isWinner, row.total === maxTotal);
        }
      } else {
        assert.deepEqual(result.winnerPlayerIds, [], 'aucun gagnant si personne ne marque');
      }
    }
  });

  it('un Pretendant couronne ET ayant son objectif atteint le score maximal (3 pts)', () => {
    const engine = GameEngine.create({ players: makePlayers(3), crisisDeck: makeDeck(9), rngSeed: 11 });
    const claimantId = findByAllegiance(engine, ['p0', 'p1', 'p2'], Allegiance.CLAIMANT)!;
    const result = playFullGame(engine, () => 'b');
    // On sait (test G1) qu'avec ce seed le Pretendant est couronne -> au moins 2 pts de camp.
    const claimantRow = result.scoreboard.find((s) => s.playerId === claimantId)!;
    assert.equal(claimantRow.campPoints, 2, 'le Pretendant couronne marque les points de camp');
    assert.ok(result.winnerPlayerIds.length >= 1);
  });
});

describe('GameEngine — accusations (regression G2 : le demasquage existe)', () => {
  function advanceToNegotiation(engine: GameEngine): void {
    engine.start(); // -> CRISIS
    engine.openNegotiation();
  }

  it('une accusation juste revele publiquement l\'Agent etranger', () => {
    const engine = GameEngine.create({ players: makePlayers(4), rngSeed: 3 });
    const ids = ['p0', 'p1', 'p2', 'p3'];
    advanceToNegotiation(engine);
    const agentId = findByAllegiance(engine, ids, Allegiance.FOREIGN_AGENT)!;
    const accuserId = findByAllegiance(engine, ids, Allegiance.LOYALIST)!;

    const events: AccusationRecord[] = [];
    engine.on('playerAccused', ({ record }) => events.push(record));

    const record = engine.accuse(accuserId, agentId);
    assert.equal(record.outcome, 'REVEALED_AGENT');
    assert.equal(record.revealedPlayerId, agentId);
    assert.equal(events.length, 1);

    const publicAgent = engine.getPublicState().players.find((p) => p.id === agentId)!;
    assert.equal(publicAgent.revealedAllegiance, Allegiance.FOREIGN_AGENT);
  });

  it('une accusation fausse se retourne contre son auteur', () => {
    const engine = GameEngine.create({ players: makePlayers(4), rngSeed: 3 });
    const ids = ['p0', 'p1', 'p2', 'p3'];
    advanceToNegotiation(engine);
    const accuserId = findByAllegiance(engine, ids, Allegiance.CLAIMANT)!;
    const innocentId = findByAllegiance(engine, ids, Allegiance.LOYALIST)!;

    const record = engine.accuse(accuserId, innocentId);
    assert.equal(record.outcome, 'BACKFIRED');
    assert.equal(record.revealedPlayerId, accuserId);

    const publicAccuser = engine.getPublicState().players.find((p) => p.id === accuserId)!;
    assert.equal(publicAccuser.revealedAllegiance, Allegiance.CLAIMANT);
    assert.equal(publicAccuser.hasAccused, true);
  });

  it('une seule accusation par joueur et par partie', () => {
    const engine = GameEngine.create({ players: makePlayers(4), rngSeed: 3 });
    advanceToNegotiation(engine);
    engine.accuse('p0', 'p1');
    assert.throws(() => engine.accuse('p0', 'p2'), /Une seule accusation/);
  });

  it("un Agent demasque perd sa victoire d'effondrement", () => {
    const engine = GameEngine.create({
      players: makePlayers(4),
      crisisDeck: makeDeck(9, { collapseFast: true }),
      rngSeed: 3,
    });
    const ids = ['p0', 'p1', 'p2', 'p3'];
    engine.start();
    engine.openNegotiation();
    const agentId = findByAllegiance(engine, ids, Allegiance.FOREIGN_AGENT)!;
    const accuserId = findByAllegiance(engine, ids, Allegiance.LOYALIST)!;
    engine.accuse(accuserId, agentId);

    // Tout le monde vote l'option destructrice jusqu'a l'effondrement.
    const result = playFullGame(engine, () => 'c');
    assert.equal(result.kingdomSurvived, false);
    const agentVictory = result.victories.find((v) => v.type === VictoryType.FOREIGN_AGENT_COLLAPSE);
    assert.equal(agentVictory, undefined, 'aucune victoire d\'Agent : le seul agent etait demasque');
  });
});

describe('GameEngine — pouvoirs (regression M1 : plus de deadlock)', () => {
  /** Trouve une graine ou un joueur possede le pouvoir demande. */
  function createWithPower(n: number, power: PowerType): { engine: GameEngine; ownerId: string } {
    for (let seed = 1; seed < 300; seed++) {
      const engine = GameEngine.create({ players: makePlayers(n), rngSeed: seed });
      const ids = makePlayers(n).map((p) => p.id);
      const ownerId = ids.find((id) => engine.getPrivateStateFor(id).powers.some((p) => p.type === power));
      if (ownerId) return { engine, ownerId };
    }
    throw new Error(`Aucune graine ne donne le pouvoir ${power}`);
  }

  function advanceToPowers(engine: GameEngine): void {
    engine.start();
    engine.openNegotiation();
    engine.openPowers();
  }

  it('la deconnexion de la cible entre intention et resolution ne bloque plus la partie', () => {
    const { engine, ownerId } = createWithPower(4, PowerType.SPY_ALLEGIANCE);
    advanceToPowers(engine);
    const target = engine.getPublicState().players.find((p) => p.id !== ownerId)!;

    const privateResults: Array<{ playerId: string; payload: unknown }> = [];
    engine.on('privatePowerResult', (e) => privateResults.push(e));

    engine.usePower(ownerId, PowerType.SPY_ALLEGIANCE, target.id);
    engine.setPlayerConnected(target.id, false);

    // Avant le correctif : InvalidTargetError ici, partie definitivement
    // coincee en phase POWERS. Desormais la transition passe.
    assert.doesNotThrow(() => engine.openVote());
    assert.equal(engine.getPublicState().phase, GamePhase.VOTE);
    const spyResult = privateResults.find((r) => r.playerId === ownerId);
    assert.ok(spyResult, "l'espion recoit son resultat prive");
  });

  it('le payload public de powersResolved ne contient jamais les actions d\'espionnage', () => {
    const { engine, ownerId } = createWithPower(4, PowerType.SPY_ALLEGIANCE);
    advanceToPowers(engine);
    const target = engine.getPublicState().players.find((p) => p.id !== ownerId)!;

    let publicPayload: PublicPowerResolution | null = null;
    engine.on('powersResolved', (payload) => {
      publicPayload = payload;
    });

    engine.usePower(ownerId, PowerType.SPY_ALLEGIANCE, target.id);
    engine.openVote();

    assert.ok(publicPayload);
    const resolution: PublicPowerResolution = publicPayload!;
    const all = [...resolution.applied, ...resolution.blocked];
    assert.equal(all.some((a) => a.power === PowerType.SPY_ALLEGIANCE), false, 'fuite: action SPY broadcast');
    assert.equal(resolution.hiddenActionCount, 1);
  });

  it('BLOCK_POWER annule le pouvoir vise et le bloque est prevenu en prive', () => {
    // Cherche une graine avec un bloqueur ET un espion distincts.
    for (let seed = 1; seed < 500; seed++) {
      const engine = GameEngine.create({ players: makePlayers(5), rngSeed: seed });
      const ids = makePlayers(5).map((p) => p.id);
      const blocker = ids.find((id) => engine.getPrivateStateFor(id).powers.some((p) => p.type === PowerType.BLOCK_POWER));
      const spy = ids.find((id) => engine.getPrivateStateFor(id).powers.some((p) => p.type === PowerType.SPY_ALLEGIANCE));
      if (!blocker || !spy || blocker === spy) continue;

      advanceToPowers(engine);
      const spyTarget = ids.find((id) => id !== spy && id !== blocker)!;

      const privateResults: Array<{ playerId: string; payload: unknown }> = [];
      engine.on('privatePowerResult', (e) => privateResults.push(e));

      engine.usePower(spy, PowerType.SPY_ALLEGIANCE, spyTarget);
      engine.usePower(blocker, PowerType.BLOCK_POWER, spy);
      engine.openVote();

      const spyPrivate = privateResults.find((r) => r.playerId === spy);
      assert.ok(spyPrivate, 'le bloque est notifie');
      assert.equal((spyPrivate!.payload as { type: string }).type, 'POWER_BLOCKED');
      // Le pouvoir bloque n'est pas consomme.
      const uses = engine.getPrivateStateFor(spy).powers.find((p) => p.type === PowerType.SPY_ALLEGIANCE)!.usesRemaining;
      assert.ok(uses > 0);
      return;
    }
    throw new Error('Aucune graine avec bloqueur + espion distincts');
  });
});

describe('GameEngine — second tour de vote (revote force)', () => {
  /** Paquet a 2 options douces, pour provoquer facilement des egalites. */
  function twoOptionDeck(size: number): CrisisCard[] {
    return Array.from({ length: size }, (_, i) => ({
      id: `rv-${i}`,
      code: `RV_${i}`,
      title: `Crise ${i}`,
      description: 'test',
      options: [
        { id: 'a', label: 'A', effects: { stability: 1, treasury: -1 } },
        { id: 'b', label: 'B', effects: { faith: 1, army: -1 } },
      ],
    }));
  }

  function createWithForceRevote(): { engine: GameEngine; ids: string[]; owner: string } {
    for (let seed = 1; seed < 500; seed++) {
      const engine = GameEngine.create({ players: makePlayers(3), crisisDeck: twoOptionDeck(9), rngSeed: seed });
      const ids = ['p0', 'p1', 'p2'];
      const owner = ids.find((id) => engine.getPrivateStateFor(id).powers.some((p) => p.type === PowerType.FORCE_REVOTE));
      if (owner) return { engine, ids, owner };
    }
    throw new Error('Aucune graine ne donne FORCE_REVOTE a 3 joueurs');
  }

  it('au second tour, un joueur ne peut pas reprendre son vote du premier tour', () => {
    const { engine, ids, owner } = createWithForceRevote();
    engine.start();
    engine.openNegotiation();
    engine.openPowers();
    engine.usePower(owner, PowerType.FORCE_REVOTE);
    engine.openVote();

    // Egalite 1-1 (le 3e s'abstient) -> declenche le revote.
    engine.castVote(ids[0], 'a');
    engine.castVote(ids[1], 'b');
    engine.resolveVotes();
    assert.equal(engine.getPublicState().phase, GamePhase.VOTE, 'le revote garde la partie en phase VOTE');

    // Chacun connait (en prive) l'option qu'il ne peut pas reprendre.
    assert.equal(engine.getPrivateStateFor(ids[0]).revoteBlockedOptionId, 'a');
    assert.equal(engine.getPrivateStateFor(ids[1]).revoteBlockedOptionId, 'b');
    // Celui qui s'est abstenu au 1er tour n'a aucune restriction.
    assert.equal(engine.getPrivateStateFor(ids[2]).revoteBlockedOptionId, undefined);

    // Reprendre le meme choix est refuse ; changer est permis.
    assert.throws(() => engine.castVote(ids[0], 'a'), /second tour/i);
    assert.doesNotThrow(() => engine.castVote(ids[0], 'b'));
    assert.doesNotThrow(() => engine.castVote(ids[1], 'a'));
    assert.doesNotThrow(() => engine.castVote(ids[2], 'a')); // abstentionniste : libre

    // Deuxieme resolution : plus de revote (cap a un par manche), on avance.
    engine.resolveVotes();
    assert.equal(engine.getPublicState().phase, GamePhase.RESOLUTION);
  });

  it("hors d'un revote, aucune restriction : revoteBlockedOptionId reste absent", () => {
    const engine = GameEngine.create({ players: makePlayers(3), crisisDeck: twoOptionDeck(9), rngSeed: 5 });
    engine.start();
    engine.openNegotiation();
    engine.openPowers();
    engine.openVote();
    assert.equal(engine.getPrivateStateFor('p0').revoteBlockedOptionId, undefined);
    assert.doesNotThrow(() => engine.castVote('p0', 'a'));
    // On peut changer d'avis librement au premier tour.
    assert.doesNotThrow(() => engine.castVote('p0', 'a'));
  });
});

describe('GameEngine — divers', () => {
  it('rejette les votes vers des options inexistantes et les joueurs inconnus', () => {
    const engine = GameEngine.create({ players: makePlayers(3), rngSeed: 5 });
    engine.start();
    engine.openNegotiation();
    engine.openPowers();
    engine.openVote();
    assert.throws(() => engine.castVote('p0', 'option-bidon'));
    assert.throws(() => engine.castVote('fantome', 'a'));
  });

  it('allConnectedPlayersVoted permet la resolution anticipee', () => {
    const engine = GameEngine.create({ players: makePlayers(3), rngSeed: 5 });
    engine.start();
    engine.openNegotiation();
    engine.openPowers();
    engine.openVote();
    const optionId = engine.getPublicState().currentCrisis!.options[0].id;
    engine.castVote('p0', optionId);
    engine.castVote('p1', optionId);
    assert.equal(engine.allConnectedPlayersVoted(), false);
    engine.castVote('p2', optionId);
    assert.equal(engine.allConnectedPlayersVoted(), true);
  });
});
