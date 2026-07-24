import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mulberry32 } from '../engine/rng';
import { VoteResolver } from '../engine/VoteResolver';
import { CrisisOption } from '../types';

const OPTIONS: CrisisOption[] = [
  { id: 'a', label: 'A', effects: {} },
  { id: 'b', label: 'B', effects: {} },
  { id: 'c', label: 'C', effects: {} },
];

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];

function resolve(votes: Record<string, string>, opts?: Partial<Parameters<typeof VoteResolver.resolve>[0]>) {
  return VoteResolver.resolve({
    options: OPTIONS,
    votes,
    allPlayerIds: PLAYERS,
    regentPlayerId: 'p1',
    regentBoosted: false,
    forced: false,
    rng: mulberry32(42),
    ...opts,
  });
}

describe('VoteResolver', () => {
  it('retient la majorite simple', () => {
    const r = resolve({ p1: 'a', p2: 'b', p3: 'b', p4: 'c' });
    assert.equal(r.chosenOptionId, 'b');
    assert.equal(r.wasTie, false);
    assert.equal(r.wasChosenByLot, false);
  });

  it('le vote du Regent departage une egalite quand il fait partie des leaders', () => {
    const r = resolve({ p1: 'c', p2: 'c', p3: 'b', p4: 'b' });
    assert.equal(r.chosenOptionId, 'c');
    assert.equal(r.wasTieBrokenByRegent, true);
    assert.equal(r.wasChosenByLot, false);
  });

  it("une egalite sans vote du Regent parmi les leaders est tiree au sort (pas 'la premiere option')", () => {
    // p1 (Regent) s'abstient ; b et c a egalite. L'ancien comportement
    // retenait toujours leaders[0] — biais public exploitable.
    const chosen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const r = resolve({ p2: 'b', p3: 'c' }, { rng: mulberry32(seed) });
      assert.equal(r.wasTieBrokenByRegent, false);
      assert.equal(r.wasChosenByLot, true);
      chosen.add(r.chosenOptionId);
    }
    assert.deepEqual([...chosen].sort(), ['b', 'c'], 'les deux leaders doivent pouvoir sortir du tirage');
  });

  it('zero vote exprime : option tiree au sort parmi toutes, partie jamais bloquee', () => {
    const chosen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const r = resolve({}, { rng: mulberry32(seed), forced: true });
      assert.ok(OPTIONS.some((o) => o.id === r.chosenOptionId));
      assert.equal(r.wasChosenByLot, true);
      assert.equal(r.abstentions.length, PLAYERS.length);
      chosen.add(r.chosenOptionId);
    }
    assert.equal(chosen.size, 3, "le tirage doit couvrir les 3 options (pas de biais vers 'a')");
  });

  it('BOOST_REGENT fait compter le vote du Regent double', () => {
    const r = resolve({ p1: 'a', p2: 'b', p3: 'b' }, { regentBoosted: true });
    // a: 2 (regent double), b: 2 -> egalite departagee par le Regent
    assert.equal(r.chosenOptionId, 'a');
  });

  it('un vote vers une option inexistante compte comme abstention', () => {
    const r = resolve({ p1: 'zzz', p2: 'b' });
    assert.equal(r.chosenOptionId, 'b');
    assert.ok(r.abstentions.includes('p1'));
  });
});
