import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { claimantTokensRequired, effectiveTotalRounds, regenciesForSeat } from '../engine/schedule';

describe('regenciesForSeat', () => {
  it('repartit 7 manches entre 3 joueurs en 3/2/2', () => {
    assert.equal(regenciesForSeat(0, 3, 7), 3);
    assert.equal(regenciesForSeat(1, 3, 7), 2);
    assert.equal(regenciesForSeat(2, 3, 7), 2);
  });

  it('donne exactement 1 regence a chaque siege quand manches == joueurs', () => {
    for (let seat = 0; seat < 8; seat++) {
      assert.equal(regenciesForSeat(seat, 8, 8), 1);
    }
  });

  it('la somme des regences vaut toujours le nombre de manches', () => {
    for (let players = 3; players <= 8; players++) {
      for (let rounds = players; rounds <= 12; rounds++) {
        let total = 0;
        for (let seat = 0; seat < players; seat++) {
          total += regenciesForSeat(seat, players, rounds);
        }
        assert.equal(total, rounds, `${players} joueurs / ${rounds} manches`);
      }
    }
  });
});

describe('claimantTokensRequired', () => {
  it('reste atteignable : jamais superieur aux regences du siege', () => {
    for (let players = 3; players <= 8; players++) {
      const rounds = effectiveTotalRounds(7, players);
      for (let seat = 0; seat < players; seat++) {
        const required = claimantTokensRequired(seat, players, rounds, 0.6);
        const regencies = regenciesForSeat(seat, players, rounds);
        assert.ok(required >= 1, 'au moins 1 jeton exige');
        assert.ok(
          required <= regencies,
          `seuil ${required} > ${regencies} regences (siege ${seat}, ${players} joueurs) : victoire impossible`,
        );
      }
    }
  });
});

describe('effectiveTotalRounds', () => {
  it('garantit au moins une regence par joueur', () => {
    assert.equal(effectiveTotalRounds(7, 3), 7);
    assert.equal(effectiveTotalRounds(7, 8), 8);
  });
});
