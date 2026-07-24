import { GameEngineError } from '../errors';
import { BalanceReport } from './types';

/**
 * Levee quand aucune graine essayee n'a produit une partie satisfaisant
 * tous les garde-fous bloquants dans la limite d'essais autorisee. Porte
 * le dernier rapport genere pour permettre un diagnostic (quels garde-fous
 * echouent, avec quelles valeurs) plutot qu'un simple message opaque.
 */
export class PartyGenerationFailedError extends GameEngineError {
  readonly code = 'PARTY_GENERATION_FAILED';

  constructor(message: string, readonly lastReport: BalanceReport) {
    super(message);
  }
}
