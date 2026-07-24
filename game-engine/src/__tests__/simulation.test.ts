import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PartyGenerator } from '../balance/PartyGenerator';
import { GameEngine } from '../engine/GameEngine';
import { mulberry32 } from '../engine/rng';
import { GameEngineError } from '../errors';
import { GamePhase } from '../types';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, displayName: `Joueur ${i}` }));
}

/**
 * Fuzzing : des agents aleatoires jouent des parties completes en envoyant
 * des actions valides ET invalides dans un ordre arbitraire. Invariants :
 * - la partie se termine toujours (pas de deadlock possible) ;
 * - seules des erreurs metier typees (GameEngineError) sont levees ;
 * - les ressources restent bornees ;
 * - le resultat final est structurellement coherent.
 * C'est le test qui aurait attrape le deadlock M1 de l'audit.
 */
describe('Simulation — agents aleatoires', () => {
  it('600 parties aleatoires (3 a 8 joueurs) se terminent sans erreur inattendue', () => {
    for (let run = 0; run < 600; run++) {
      const chaos = mulberry32(run * 7919 + 1);
      const n = 3 + Math.floor(chaos() * 6);
      const players = makePlayers(n);
      const ids = players.map((p) => p.id);
      const engine = GameEngine.create({ players, rngSeed: run });
      engine.start();

      const attempt = (action: () => void) => {
        try {
          action();
        } catch (error) {
          if (!(error instanceof GameEngineError)) {
            throw new Error(`Partie ${run}: erreur non typee: ${(error as Error).stack}`);
          }
        }
      };

      const randomId = () => ids[Math.floor(chaos() * ids.length)];

      let guard = 0;
      while (!engine.isGameOver()) {
        if (++guard > 1000) throw new Error(`Partie ${run}: non terminee apres 1000 iterations`);
        const state = engine.getPublicState();

        // Deconnexions/reconnexions aleatoires (~10% des iterations).
        if (chaos() < 0.1) attempt(() => engine.setPlayerConnected(randomId(), chaos() < 0.5));

        // Accusations sauvages (~5%), y compris hors phase et auto-accusations.
        if (chaos() < 0.05) attempt(() => engine.accuse(randomId(), randomId()));

        if (state.phase === GamePhase.POWERS) {
          // Tentatives de pouvoirs, valides ou non (mauvaise cible, double usage...).
          for (const id of ids) {
            if (chaos() < 0.4) {
              const priv = engine.getPrivateStateFor(id);
              const power = priv.powers[0];
              attempt(() => engine.usePower(id, power.type, randomId()));
              attempt(() => engine.usePower(id, power.type)); // sans cible
            }
          }
        }

        if (state.phase === GamePhase.VOTE && state.currentCrisis) {
          for (const id of ids) {
            const roll = chaos();
            if (roll < 0.55) {
              const options = state.currentCrisis.options;
              const optionId = options[Math.floor(chaos() * options.length)].id;
              attempt(() => engine.castVote(id, optionId));
            } else if (roll < 0.65) {
              attempt(() => engine.castVote(id, 'option-inexistante'));
            }
            // sinon abstention
          }
        }

        attempt(() => engine.forceAdvance());
      }

      const result = engine.getFinalResult();
      assert.equal(result.objectiveResults.length, n);
      assert.equal(result.finalRoles.length, n);
      const resources = engine.getPublicState().resources;
      for (const value of Object.values(resources)) {
        assert.ok(value >= 0 && value <= 10);
      }
      if (!result.kingdomSurvived) {
        // Un royaume note "non survivant" pour cause d'effondrement doit avoir un round d'effondrement coherent.
        if (result.collapsedAtRound !== undefined) {
          assert.ok(result.collapsedAtRound >= 1 && result.collapsedAtRound <= engine.config.totalRounds);
        }
      }
    }
  });
});

describe('PartyGenerator — generation equilibree de bout en bout', () => {
  for (let n = 3; n <= 8; n++) {
    it(`genere une partie equilibree et solvable a ${n} joueurs`, () => {
      const { engine, report } = PartyGenerator.generate({ players: makePlayers(n), rngSeed: 1234 + n });
      assert.equal(report.passed, true);
      assert.equal(report.solvability.canAvoidCollapse, true);
      assert.ok(report.electability.electabilityIndex >= 1, 'la couronne doit rester atteignable');
      // La partie generee est jouable jusqu'au bout.
      engine.start();
      let guard = 0;
      while (!engine.isGameOver()) {
        if (++guard > 200) throw new Error('Partie generee non terminee');
        engine.forceAdvance();
      }
    });
  }
});
