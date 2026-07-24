// ============================================================================
// Coefficients d'equilibrage — chaque valeur est un levier de design
// explicite, documente avec sa justification. Les modifier change le
// "feeling" des parties generees ; les bornes (min/max) empechent qu'un
// reglage isole ne produise une partie structurellement injouable.
// ============================================================================

export const BALANCE_COEFFICIENTS = {
  /**
   * Ratio [min, max] entre la puissance moyenne (RPI) d'un role hostile
   * (l'"Assassin" — Agent etranger dans Le Conseil) et la puissance
   * moyenne d'un Loyaliste. En dessous : le role hostile est un figurant
   * sans influence reelle (aucune tension). Au-dessus : il domine
   * l'information et le vote au point de rendre la partie illisible pour
   * les autres camps ("Assassin trop puissant").
   */
  assassinPowerRatio: { min: 0.7, max: 1.4 },

  /** Nombre maximal de pouvoirs de poids >= 3 qu'un meme role hostile peut cumuler. */
  maxHighWeightPowersPerHostile: 1,

  /**
   * Marge de securite appliquee au seuil d'election du Roi (Pretendant) :
   * KEI = mandatsMaximauxAtteignables / seuilRequis doit rester >= min
   * (le titre doit rester atteignable avec de la marge, meme en cas de
   * manches "perdues" pour lui) et <= max (sinon la couronne devient un
   * acquis automatique, ce qui trivialise sa victoire).
   */
  electabilityIndex: { min: 1.3, max: 3.0 },

  /** Part des propres tours de Regence que le Pretendant doit convertir en soutien pour esperer le trone. */
  claimantSupportPerRegentTurn: 0.6,

  /**
   * Un round ou personne ne peut etre Regent (totalRounds < playerCount)
   * rend une couronne mathematiquement hors d'atteinte pour le siege
   * defavorise. Regle dure, jamais assouplie par le generateur.
   */
  minRoundsPerPlayer: 1,

  /**
   * Une ressource est consideree "recuperable" par une option si son delta
   * est superieur ou egal a ce seuil. Utilise pour compter les cartes de
   * secours disponibles dans un paquet.
   */
  rescueDeltaThreshold: 2,

  /** Proportion minimale de cartes de secours (par ressource) exigee dans tout paquet valide. */
  minRescueCardRatio: 0.2,

  /** Nombre maximal de tentatives de generation (nouvelle graine) avant d'abandonner. */
  maxGenerationAttempts: 200,

  /** Nombre maximal de tentatives de re-tirage cible pour la seule repartition des pouvoirs. */
  maxPowerReassignAttempts: 50,
} as const;
