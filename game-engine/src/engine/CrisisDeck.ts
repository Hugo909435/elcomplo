import { validateCrisisDeck } from '../content/crisisCards';
import { ContentPoolExhaustedError } from '../errors';
import { CrisisCard, GameConfig } from '../types';
import { RandomFn, shuffle } from './rng';

export class CrisisDeck {
  private drawPile: CrisisCard[];

  constructor(cards: CrisisCard[], config: GameConfig, rng: RandomFn) {
    validateCrisisDeck(cards, config);
    this.drawPile = shuffle(cards, rng);
  }

  draw(): CrisisCard {
    const card = this.drawPile.shift();
    if (!card) {
      throw new ContentPoolExhaustedError('Le paquet de crises est epuise');
    }
    return card;
  }

  remaining(): number {
    return this.drawPile.length;
  }

  /**
   * Copie en lecture seule des cartes pas encore piochees, dans leur ordre
   * de tirage. Ne mute pas le paquet — utilise par le systeme d'equilibrage
   * pour verifier la "solvabilite" d'une partie avant qu'elle ne commence.
   */
  peekRemaining(): CrisisCard[] {
    return this.drawPile.slice();
  }
}
