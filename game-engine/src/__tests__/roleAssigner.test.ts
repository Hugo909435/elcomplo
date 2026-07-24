import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRoleDistribution } from '../config/roleDistribution';
import { DEFAULT_ROLES } from '../content/roles';
import { DEFAULT_SECRET_OBJECTIVES } from '../content/secretObjectives';
import { mulberry32 } from '../engine/rng';
import { isObjectiveFeasibleForSeat, RoleAssigner } from '../engine/RoleAssigner';
import { effectiveTotalRounds } from '../engine/schedule';
import { Allegiance } from '../types';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, seatIndex: i }));
}

const roleById = new Map(DEFAULT_ROLES.map((r) => [r.id, r]));
const objectiveById = new Map(DEFAULT_SECRET_OBJECTIVES.map((o) => [o.id, o]));

describe('RoleAssigner', () => {
  for (let n = 3; n <= 8; n++) {
    it(`distribue correctement roles, allegeances et objectifs a ${n} joueurs (100 graines)`, () => {
      const distribution = getRoleDistribution(n);
      const totalRounds = effectiveTotalRounds(7, n);

      for (let seed = 0; seed < 100; seed++) {
        const assignment = RoleAssigner.assign({
          players: makePlayers(n),
          objectivePool: DEFAULT_SECRET_OBJECTIVES,
          rolePool: DEFAULT_ROLES,
          totalRounds,
          rng: mulberry32(seed),
        });

        assert.equal(assignment.size, n);

        const allegiances = [...assignment.values()].map((a) => a.allegiance);
        assert.equal(allegiances.filter((a) => a === Allegiance.CLAIMANT).length, distribution.claimants);
        assert.equal(allegiances.filter((a) => a === Allegiance.FOREIGN_AGENT).length, distribution.foreignAgents);
        assert.ok(allegiances.filter((a) => a === Allegiance.LOYALIST).length >= 1);

        // Roles uniques et coherents avec l'allegeance tiree.
        const roleIds = [...assignment.values()].map((a) => a.roleId);
        assert.equal(new Set(roleIds).size, n, 'chaque joueur recoit un role distinct');
        for (const [, a] of assignment) {
          assert.equal(roleById.get(a.roleId)!.allegiance, a.allegiance);
        }

        // Objectifs uniques, compatibles et realisables pour le siege.
        const objectiveIds = [...assignment.values()].map((a) => a.secretObjectiveId);
        assert.equal(new Set(objectiveIds).size, n);
        for (const [playerId, a] of assignment) {
          const seatIndex = Number(playerId.slice(1));
          const objective = objectiveById.get(a.secretObjectiveId)!;
          assert.ok(
            objective.compatibleAllegiances === 'ANY' || objective.compatibleAllegiances.includes(a.allegiance),
          );
          assert.ok(
            isObjectiveFeasibleForSeat(objective.condition, seatIndex, n, totalRounds),
            `objectif ${objective.id} irrealisable pour le siege ${seatIndex} a ${n} joueurs`,
          );
        }
      }
    });
  }

  it("le pool par defaut ne contient aucun objectif 'REGENT_AT_LEAST' (gagne d'avance, sans agentivite)", () => {
    // Decision de design : la regence tourne dans un ordre fixe et un joueur ne
    // peut jamais eviter d'etre Regent quand son siege arrive. Un objectif du
    // type "sois Regent N fois" est donc soit gagne d'avance, soit impossible.
    for (const objective of DEFAULT_SECRET_OBJECTIVES) {
      assert.notEqual(objective.condition.type, 'REGENT_AT_LEAST', `objectif ${objective.id} sans agentivite`);
    }
  });
});
