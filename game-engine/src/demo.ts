import { GameEngine, InvalidPlayerCountError, PowerType } from './index';

function playFullGame(): void {
  const engine = GameEngine.create({
    players: [
      { id: 'p1', displayName: 'Aldric' },
      { id: 'p2', displayName: 'Beatrix' },
      { id: 'p3', displayName: 'Cassian' },
      { id: 'p4', displayName: 'Delphine' },
      { id: 'p5', displayName: 'Edmund' },
    ],
    rngSeed: 42, // partie deterministe et reproductible
  });

  engine.on('crisisRevealed', ({ crisis, regentPlayerId, roundNumber }) => {
    console.log(`\n--- Manche ${roundNumber} : ${crisis.title} (Regent: ${regentPlayerId}) ---`);
  });
  engine.on('roundResolved', ({ record, resources }) => {
    console.log(`Option retenue: ${record.chosenOptionId} | Ressources: ${JSON.stringify(resources)}`);
  });
  engine.on('gameEnded', ({ result }) => {
    console.log('\n=== FIN DE PARTIE ===');
    console.log('Royaume survit ?', result.kingdomSurvived);
    console.log('Victoires:', result.victories);
    console.log('Objectifs personnels:', result.objectiveResults);
    console.log('Roles finaux:', result.finalRoles);
  });

  for (const playerId of ['p1', 'p2', 'p3', 'p4', 'p5']) {
    const priv = engine.getPrivateStateFor(playerId);
    console.log(`${playerId}: ${priv.allegiance} | objectif: ${priv.secretObjective.code} | pouvoir: ${priv.powers[0].type}`);
  }

  engine.start();

  let safetyCounter = 0;
  while (!engine.isGameOver() && safetyCounter < 100) {
    safetyCounter += 1;
    const state = engine.getPublicState();

    switch (state.phase) {
      case 'CRISIS':
        engine.openNegotiation();
        break;
      case 'NEGOTIATION':
        engine.openPowers();
        break;
      case 'POWERS': {
        // Le joueur au siege 0 espionne le joueur au siege 1 si son pouvoir le permet.
        const spy = state.players.find((p) => p.seatIndex === 0)!;
        const target = state.players.find((p) => p.seatIndex === 1)!;
        try {
          engine.usePower(spy.id, PowerType.SPY_ALLEGIANCE, target.id);
        } catch {
          // pouvoir non possede ce round, ignore.
        }
        engine.openVote();
        break;
      }
      case 'VOTE': {
        const crisis = state.currentCrisis!;
        for (const player of state.players) {
          const optionIndex = (player.seatIndex + state.roundNumber) % crisis.options.length;
          engine.castVote(player.id, crisis.options[optionIndex].id);
        }
        engine.resolveVotes();
        break;
      }
      case 'RESOLUTION':
        engine.continueAfterResolution();
        break;
      default:
        break;
    }
  }

  if (!engine.isGameOver()) {
    throw new Error('La simulation ne converge pas vers une fin de partie (boucle de securite atteinte)');
  }
}

function demonstrateGuardRails(): void {
  console.log('\n--- Verification des garde-fous ---');
  try {
    GameEngine.create({ players: [{ id: 'solo', displayName: 'Seul' }] });
    console.log('ECHEC: une partie a 1 joueur aurait du etre rejetee');
  } catch (err) {
    if (err instanceof InvalidPlayerCountError) {
      console.log('OK: partie a 1 joueur rejetee ->', err.message);
    } else {
      throw err;
    }
  }

  const engine = GameEngine.create({
    players: [
      { id: 'a', displayName: 'A' },
      { id: 'b', displayName: 'B' },
      { id: 'c', displayName: 'C' },
    ],
    rngSeed: 1,
  });
  try {
    engine.castVote('a', 'x');
    console.log('ECHEC: un vote avant demarrage de partie aurait du etre rejete');
  } catch (err) {
    console.log('OK: vote hors phase rejete ->', (err as Error).message);
  }
}

playFullGame();
demonstrateGuardRails();
