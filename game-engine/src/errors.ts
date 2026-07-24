// ============================================================================
// Erreurs typees du moteur — chaque erreur porte un code stable, serialisable
// a travers la frontiere moteur -> gateway -> client (le message texte, lui,
// peut changer sans casser un contrat cote client).
// ============================================================================

export abstract class GameEngineError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Nombre de joueurs hors des bornes supportees par les regles (3 a 8). */
export class InvalidPlayerCountError extends GameEngineError {
  readonly code = 'INVALID_PLAYER_COUNT';
}

/** Action recue dans une phase qui ne l'autorise pas, ou transition de phase illegale. */
export class InvalidPhaseTransitionError extends GameEngineError {
  readonly code = 'INVALID_PHASE_TRANSITION';
}

/** Le contenu fourni (paquet de crises, pool d'objectifs) est insuffisant pour jouer la partie demandee. */
export class ContentPoolExhaustedError extends GameEngineError {
  readonly code = 'CONTENT_POOL_EXHAUSTED';
}

/** Un joueur tente une action qu'il n'est pas autorise a faire (pouvoir non possede, hors tour, etc). */
export class UnauthorizedActionError extends GameEngineError {
  readonly code = 'UNAUTHORIZED_ACTION';
}

/** Cible invalide pour un pouvoir ou une action (inconnue, deconnectee, ou soi-meme). */
export class InvalidTargetError extends GameEngineError {
  readonly code = 'INVALID_TARGET';
}

/** La configuration fournie produirait une partie desequilibree (roles, seuils, contenu). */
export class ConfigurationImbalanceError extends GameEngineError {
  readonly code = 'CONFIGURATION_IMBALANCE';
}
