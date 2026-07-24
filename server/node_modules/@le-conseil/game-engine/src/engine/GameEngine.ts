import { DEFAULT_CONFIG } from '../config/gameConfig';
import { DEFAULT_CRISIS_DECK } from '../content/crisisCards';
import { DEFAULT_ROLES } from '../content/roles';
import { DEFAULT_SECRET_OBJECTIVES, validateObjectivePool } from '../content/secretObjectives';
import {
  InvalidPhaseTransitionError,
  InvalidPlayerCountError,
  InvalidTargetError,
  UnauthorizedActionError,
} from '../errors';
import {
  AccusationRecord,
  Allegiance,
  CreateGameParams,
  CrisisCard,
  GameConfig,
  GamePhase,
  GameResult,
  PlayerRuntime,
  PowerActionRecord,
  PowerType,
  PrivatePlayerState,
  PublicGameState,
  ResourceState,
  RoleDefinition,
  RoundRecord,
  SecretObjective,
} from '../types';
import { CrisisDeck } from './CrisisDeck';
import { PowerIntent, POWER_REQUIRES_TARGET, PowerResolver } from './PowerResolver';
import { mulberry32, RandomFn, shuffle } from './rng';
import { ResourceManager } from './ResourceManager';
import { RoleAssigner } from './RoleAssigner';
import { claimantTokensRequired, effectiveTotalRounds, regenciesForSeat } from './schedule';
import { VictoryEvaluator } from './VictoryEvaluator';
import { VoteResolution, VoteResolver } from './VoteResolver';

/**
 * Graphe des transitions de phase autorisees. C'est la seule source de
 * verite sur "quelle phase peut succeder a quelle phase" — toute transition
 * hors de ce graphe est rejetee, ce qui rend une sequence de jeu illegale
 * (ex: voter avant que la crise ne soit revelee) structurellement impossible.
 */
const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.LOBBY]: [GamePhase.ROLE_ASSIGNMENT],
  [GamePhase.ROLE_ASSIGNMENT]: [GamePhase.CRISIS],
  [GamePhase.CRISIS]: [GamePhase.NEGOTIATION],
  [GamePhase.NEGOTIATION]: [GamePhase.POWERS],
  [GamePhase.POWERS]: [GamePhase.VOTE],
  [GamePhase.VOTE]: [GamePhase.RESOLUTION],
  [GamePhase.RESOLUTION]: [GamePhase.CRISIS, GamePhase.GAME_END],
  [GamePhase.GAME_END]: [],
};

/**
 * Payload public de la resolution des pouvoirs. Les actions d'espionnage
 * (SPY_ALLEGIANCE) n'y figurent JAMAIS : les diffuser reviendrait a reveler
 * publiquement qui espionne qui. Seul hiddenActionCount trahit qu'"il s'est
 * passe quelque chose dans l'ombre", sans dire quoi ni qui.
 */
export interface PublicPowerResolution {
  applied: PowerActionRecord[];
  blocked: PowerActionRecord[];
  hiddenActionCount: number;
}

interface EngineEventMap {
  privateRoleAssigned: { playerId: string; state: PrivatePlayerState };
  phaseChanged: { phase: GamePhase };
  crisisRevealed: { crisis: CrisisCard; regentPlayerId: string; roundNumber: number };
  voteCast: { playerId: string; votedCount: number };
  voteForcedRevote: { roundNumber: number };
  powersResolved: PublicPowerResolution;
  privatePowerResult: { playerId: string; payload: unknown };
  playerAccused: { record: AccusationRecord };
  roundResolved: { record: RoundRecord; resources: ResourceState; resolution: VoteResolution };
  gameEnded: { result: GameResult };
}

type EngineEventName = keyof EngineEventMap;
type EngineHandler<K extends EngineEventName> = (payload: EngineEventMap[K]) => void;

interface GameEngineInit {
  config: GameConfig;
  players: Map<string, PlayerRuntime>;
  seatOrder: string[];
  deck: CrisisDeck;
  objectivePoolById: Map<string, SecretObjective>;
  rolePoolById: Map<string, RoleDefinition>;
  rng: RandomFn;
}

/**
 * Moteur de regles du jeu "Le Conseil".
 *
 * Aucune dependance vers Socket.io, NestJS, React ou toute autre couche de
 * transport/presentation : le moteur expose des methodes imperatives
 * (intentions des joueurs) et un systeme d'evenements (`on`) que la couche
 * reseau (ex: un Gateway NestJS) peut ecouter pour diffuser l'etat via
 * WebSocket. Le moteur est seul autoritaire sur les regles ; il peut donc
 * etre teste unitairement sans serveur ni navigateur.
 *
 * CONTRAT DE CONFIDENTIALITE (a respecter par toute couche reseau) :
 * - `privateRoleAssigned` et `privatePowerResult` ne doivent etre envoyes
 *   qu'au socket du joueur concerne (payload.playerId) ;
 * - `getPrivateStateFor(x)` ne doit jamais etre servi a un autre joueur que x ;
 * - `peekUpcomingCrises()` et `getRngInternals` ne doivent jamais quitter le serveur ;
 * - tous les autres evenements sont concus pour etre diffusables tels quels.
 */
export class GameEngine {
  readonly config: GameConfig;

  private players: Map<string, PlayerRuntime>;
  private seatOrder: string[];
  private deck: CrisisDeck;
  private objectivePoolById: Map<string, SecretObjective>;
  private rolePoolById: Map<string, RoleDefinition>;
  private rng: RandomFn;

  private phase: GamePhase = GamePhase.LOBBY;
  private roundNumber = 0;
  private resources: ResourceState;
  private regentPlayerId: string | null = null;
  private currentCrisis: CrisisCard | null = null;
  private currentVotes: Record<string, string> = {};
  private currentPowerIntents: PowerIntent[] = [];
  private currentPowerActions: PowerActionRecord[] = [];
  private regentBoostActive = false;
  private revoteArmed = false;
  private revoteConsumedThisRound = false;
  /** Second tour de vote : playerId -> option votee au premier tour (interdite a la reselection). */
  private revoteBlockedByPlayer: Record<string, string> = {};
  private collapsed = false;
  private collapsedAtRound?: number;
  private rounds: RoundRecord[] = [];
  private accusations: AccusationRecord[] = [];
  private result: GameResult | null = null;

  private listeners: Partial<{ [K in EngineEventName]: Array<EngineHandler<K>> }> = {};

  private constructor(init: GameEngineInit) {
    this.config = init.config;
    this.players = init.players;
    this.seatOrder = init.seatOrder;
    this.deck = init.deck;
    this.objectivePoolById = init.objectivePoolById;
    this.rolePoolById = init.rolePoolById;
    this.rng = init.rng;
    this.resources = { ...init.config.startingResources };
  }

  // ==========================================================================
  // Construction
  // ==========================================================================

  static create(params: CreateGameParams): GameEngine {
    const config: GameConfig = { ...DEFAULT_CONFIG, ...params.config };

    if (params.players.length < config.minPlayers || params.players.length > config.maxPlayers) {
      throw new InvalidPlayerCountError(
        `Le Conseil se joue de ${config.minPlayers} a ${config.maxPlayers} joueurs (recu: ${params.players.length})`,
      );
    }

    const uniqueIds = new Set(params.players.map((p) => p.id));
    if (uniqueIds.size !== params.players.length) {
      throw new InvalidPlayerCountError('Des identifiants de joueurs sont dupliques');
    }

    // Chaque siege doit etre Regent au moins une fois : sans cela, certains
    // objectifs et le pouvoir BOOST_REGENT deviennent structurellement morts
    // pour les derniers sieges (defaut releve par l'audit a 8 joueurs).
    config.totalRounds = effectiveTotalRounds(config.totalRounds, params.players.length);

    const rng = mulberry32(params.rngSeed ?? Date.now());

    const crisisPool = params.crisisDeck ?? DEFAULT_CRISIS_DECK;
    const objectivePool = params.objectivePool ?? DEFAULT_SECRET_OBJECTIVES;
    const rolePool = params.rolePool ?? DEFAULT_ROLES;

    validateObjectivePool(objectivePool, params.players.length);

    const seatedPlayers = shuffle(params.players, rng).map((p, index) => ({ ...p, seatIndex: index }));

    const roleAssignment = RoleAssigner.assign({
      players: seatedPlayers.map((p) => ({ id: p.id, seatIndex: p.seatIndex })),
      objectivePool,
      rolePool,
      totalRounds: config.totalRounds,
      rng,
    });

    const rolePoolById = new Map(rolePool.map((r) => [r.id, r]));
    const players = new Map<string, PlayerRuntime>();
    for (const seated of seatedPlayers) {
      const assignment = roleAssignment.get(seated.id)!;
      const role = rolePoolById.get(assignment.roleId)!;
      players.set(seated.id, {
        id: seated.id,
        seatIndex: seated.seatIndex,
        displayName: seated.displayName,
        connected: true,
        allegiance: assignment.allegiance,
        roleId: assignment.roleId,
        secretObjectiveId: assignment.secretObjectiveId,
        supportTokens: 0,
        revealed: false,
        hasAccused: false,
        powers: [{ type: role.power, usesRemaining: role.powerUses }],
        stats: { regentCount: 0, votesWithMajority: 0, votesAgainstRegent: 0, powersUsed: 0 },
      });
    }

    return new GameEngine({
      config,
      players,
      seatOrder: seatedPlayers.map((p) => p.id),
      deck: new CrisisDeck(crisisPool, config, rng),
      objectivePoolById: new Map(objectivePool.map((o) => [o.id, o])),
      rolePoolById,
      rng,
    });
  }

  // ==========================================================================
  // Evenements (pub/sub interne, sans dependance a un transport)
  // ==========================================================================

  on<K extends EngineEventName>(event: K, handler: EngineHandler<K>): void {
    const handlers = (this.listeners[event] ??= []) as Array<EngineHandler<K>>;
    handlers.push(handler);
  }

  private emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): void {
    this.listeners[event]?.forEach((handler) => handler(payload));
  }

  // ==========================================================================
  // Cycle de vie / machine a etats
  // ==========================================================================

  start(): void {
    this.assertPhase(GamePhase.LOBBY);
    this.transitionTo(GamePhase.ROLE_ASSIGNMENT);
    for (const playerId of this.seatOrder) {
      this.emit('privateRoleAssigned', { playerId, state: this.getPrivateStateFor(playerId) });
    }
    this.beginRound();
  }

  openNegotiation(): void {
    this.assertPhase(GamePhase.CRISIS);
    this.transitionTo(GamePhase.NEGOTIATION);
  }

  openPowers(): void {
    this.assertPhase(GamePhase.NEGOTIATION);
    this.transitionTo(GamePhase.POWERS);
  }

  openVote(): void {
    this.assertPhase(GamePhase.POWERS);
    this.resolvePowerIntents();
    this.transitionTo(GamePhase.VOTE);
  }

  /**
   * A appeler explicitement par la couche reseau apres que le round summary
   * a ete affiche aux joueurs (ou automatiquement via forceAdvance()).
   */
  continueAfterResolution(): void {
    this.assertPhase(GamePhase.RESOLUTION);
    if (this.collapsed || this.roundNumber >= this.config.totalRounds) {
      this.endGame();
    } else {
      this.beginRound();
    }
  }

  /**
   * Point d'entree unique pour un timer de phase expire cote serveur : fait
   * avancer la partie sans que l'appelant ait besoin de connaitre la phase
   * courante. Les votes/pouvoirs manquants sont traites comme abstentions.
   */
  forceAdvance(): void {
    switch (this.phase) {
      case GamePhase.CRISIS:
        return this.openNegotiation();
      case GamePhase.NEGOTIATION:
        return this.openPowers();
      case GamePhase.POWERS:
        return this.openVote();
      case GamePhase.VOTE:
        return this.resolveVotes(true);
      case GamePhase.RESOLUTION:
        return this.continueAfterResolution();
      default:
        return;
    }
  }

  private beginRound(): void {
    this.roundNumber += 1;
    this.regentPlayerId = this.pickNextRegent();
    this.currentCrisis = this.deck.draw();
    this.currentVotes = {};
    this.currentPowerIntents = [];
    this.currentPowerActions = [];
    this.regentBoostActive = false;
    this.revoteArmed = false;
    this.revoteConsumedThisRound = false;
    this.revoteBlockedByPlayer = {};

    this.transitionTo(GamePhase.CRISIS);
    this.emit('crisisRevealed', {
      crisis: this.currentCrisis,
      regentPlayerId: this.regentPlayerId,
      roundNumber: this.roundNumber,
    });
  }

  private endGame(): void {
    this.assertPhase(GamePhase.RESOLUTION);
    this.transitionTo(GamePhase.GAME_END);
    this.result = VictoryEvaluator.evaluate({
      config: this.config,
      totalRounds: this.config.totalRounds,
      resources: this.resources,
      collapsed: this.collapsed,
      collapsedAtRound: this.collapsedAtRound,
      players: Array.from(this.players.values()),
      objectivePoolById: this.objectivePoolById,
      rolePoolById: this.rolePoolById,
    });
    this.emit('gameEnded', { result: this.result });
  }

  private transitionTo(next: GamePhase): void {
    const allowed = PHASE_TRANSITIONS[this.phase];
    if (!allowed.includes(next)) {
      throw new InvalidPhaseTransitionError(`Transition interdite: ${this.phase} -> ${next}`);
    }
    this.phase = next;
    this.emit('phaseChanged', { phase: this.phase });
  }

  // ==========================================================================
  // Decisions des joueurs
  // ==========================================================================

  castVote(playerId: string, optionId: string): void {
    this.assertPhase(GamePhase.VOTE);
    const player = this.assertPlayerExists(playerId);
    if (!player.connected) {
      throw new UnauthorizedActionError('Un joueur deconnecte ne peut pas voter');
    }
    if (!this.currentCrisis) {
      throw new InvalidPhaseTransitionError('Aucune crise active');
    }
    const validOption = this.currentCrisis.options.some((o) => o.id === optionId);
    if (!validOption) {
      throw new InvalidTargetError('Option de vote inconnue pour la crise en cours');
    }
    // Second tour de vote : interdiction de reprendre son choix du premier
    // tour (l'abstention reste possible). Force la table a bouger plutot que
    // de re-tomber sur la meme egalite.
    if (this.revoteConsumedThisRound && this.revoteBlockedByPlayer[playerId] === optionId) {
      throw new InvalidTargetError('Au second tour, tu ne peux pas revoter la meme option qu\'au premier tour');
    }
    // Ecrasement idempotent : un joueur peut changer d'avis tant que la
    // phase VOTE n'est pas resolue. Le vote reste prive jusqu'a resolution.
    this.currentVotes[playerId] = optionId;
    this.emit('voteCast', { playerId, votedCount: Object.keys(this.currentVotes).length });
  }

  /** Vrai si tous les joueurs connectes ont vote (la couche reseau peut alors resoudre sans attendre le timer). */
  allConnectedPlayersVoted(): boolean {
    if (this.phase !== GamePhase.VOTE) return false;
    return this.seatOrder
      .filter((id) => this.players.get(id)!.connected)
      .every((id) => this.currentVotes[id] !== undefined);
  }

  usePower(playerId: string, power: PowerType, targetPlayerId?: string): void {
    this.assertPhase(GamePhase.POWERS);
    const player = this.assertPlayerExists(playerId);

    const owned = player.powers.find((p) => p.type === power);
    if (!owned) {
      throw new UnauthorizedActionError(`${playerId} ne possede pas le pouvoir ${power}`);
    }
    if (owned.usesRemaining <= 0) {
      throw new UnauthorizedActionError(`Pouvoir ${power} deja epuise pour ${playerId}`);
    }
    if (this.currentPowerIntents.some((i) => i.playerId === playerId)) {
      throw new UnauthorizedActionError('Un seul pouvoir peut etre active par joueur et par manche');
    }
    if (power === PowerType.BOOST_REGENT && playerId !== this.regentPlayerId) {
      throw new UnauthorizedActionError('Seul le Regent en exercice peut activer ce pouvoir');
    }
    if (POWER_REQUIRES_TARGET[power]) {
      if (!targetPlayerId) {
        throw new InvalidTargetError(`${power} necessite une cible`);
      }
      if (targetPlayerId === playerId) {
        throw new InvalidTargetError('Un joueur ne peut pas se cibler lui-meme');
      }
      const target = this.players.get(targetPlayerId);
      if (!target || !target.connected) {
        throw new InvalidTargetError('Cible invalide ou deconnectee');
      }
    }

    this.currentPowerIntents.push({ playerId, power, targetPlayerId });
  }

  /**
   * Accusation publique — la mecanique de demasquage du jeu. Une seule par
   * joueur et par partie, jouable pendant la negociation ou la phase des
   * pouvoirs. Si la cible est bien un Agent etranger, son allegeance devient
   * publique (il perd sa victoire d'effondrement et son objectif d'ombre).
   * Sinon, l'accusation se retourne contre son auteur : c'est SA propre
   * allegeance qui est revelee a la table. Risque contre recompense.
   */
  accuse(accuserId: string, targetPlayerId: string): AccusationRecord {
    this.assertPhase([GamePhase.NEGOTIATION, GamePhase.POWERS]);
    const accuser = this.assertPlayerExists(accuserId);
    if (!accuser.connected) {
      throw new UnauthorizedActionError('Un joueur deconnecte ne peut pas accuser');
    }
    if (accuser.hasAccused) {
      throw new UnauthorizedActionError('Une seule accusation par joueur et par partie');
    }
    if (targetPlayerId === accuserId) {
      throw new InvalidTargetError('Un joueur ne peut pas s\'accuser lui-meme');
    }
    const target = this.players.get(targetPlayerId);
    if (!target) {
      throw new InvalidTargetError(`Cible inconnue: ${targetPlayerId}`);
    }

    accuser.hasAccused = true;
    const isAgent = target.allegiance === Allegiance.FOREIGN_AGENT;
    const revealedPlayer = isAgent ? target : accuser;
    revealedPlayer.revealed = true;

    const record: AccusationRecord = {
      roundNumber: this.roundNumber,
      accuserId,
      targetId: targetPlayerId,
      outcome: isAgent ? 'REVEALED_AGENT' : 'BACKFIRED',
      revealedPlayerId: revealedPlayer.id,
      revealedAllegiance: revealedPlayer.allegiance,
    };
    this.accusations.push(record);
    this.emit('playerAccused', { record });
    return record;
  }

  private resolvePowerIntents(): void {
    const result = PowerResolver.resolve(this.currentPowerIntents, this.players);
    this.currentPowerActions = result.applied;

    for (const action of result.applied) {
      if (action.power === PowerType.BOOST_REGENT) this.regentBoostActive = true;
      if (action.power === PowerType.FORCE_REVOTE) this.revoteArmed = true;
    }
    for (const [playerId, payload] of result.privateResults) {
      this.emit('privatePowerResult', { playerId, payload });
    }

    // Diffusion publique assainie : les actions d'espionnage n'apparaissent
    // jamais dans le payload broadcast (cf. contrat de confidentialite).
    const isPublic = (r: PowerActionRecord) => r.power !== PowerType.SPY_ALLEGIANCE;
    const hiddenActionCount =
      result.applied.filter((r) => !isPublic(r)).length + result.blocked.filter((r) => !isPublic(r)).length;
    this.emit('powersResolved', {
      applied: result.applied.filter(isPublic),
      blocked: result.blocked.filter(isPublic),
      hiddenActionCount,
    });
  }

  resolveVotes(forced = false): void {
    this.assertPhase(GamePhase.VOTE);
    if (!this.currentCrisis || !this.regentPlayerId) {
      throw new InvalidPhaseTransitionError('Aucune crise active a resoudre');
    }

    const resolution = VoteResolver.resolve({
      options: this.currentCrisis.options,
      votes: this.currentVotes,
      allPlayerIds: this.seatOrder,
      regentPlayerId: this.regentPlayerId,
      regentBoosted: this.regentBoostActive,
      forced,
      rng: this.rng,
    });

    if (resolution.wasTie && this.revoteArmed && !this.revoteConsumedThisRound) {
      this.revoteConsumedThisRound = true;
      // Memorise le premier vote de chacun avant de vider : au second tour,
      // personne ne pourra reprendre exactement le meme choix.
      this.revoteBlockedByPlayer = { ...this.currentVotes };
      this.currentVotes = {};
      this.emit('voteForcedRevote', { roundNumber: this.roundNumber });
      return; // reste en phase VOTE pour un second passage
    }

    const option = this.currentCrisis.options.find((o) => o.id === resolution.chosenOptionId);
    if (!option) {
      throw new InvalidTargetError('Option resolue introuvable dans la crise courante');
    }

    this.resources = ResourceManager.applyDelta(this.resources, option.effects, this.config.resourceBounds);

    const regentVote = this.currentVotes[this.regentPlayerId];
    for (const playerId of this.seatOrder) {
      const player = this.players.get(playerId)!;
      const votedOption = this.currentVotes[playerId];
      if (votedOption === resolution.chosenOptionId) {
        player.stats.votesWithMajority += 1;
      }
      if (playerId !== this.regentPlayerId && votedOption && regentVote && votedOption !== regentVote) {
        player.stats.votesAgainstRegent += 1;
      }
    }

    const regent = this.players.get(this.regentPlayerId)!;
    regent.stats.regentCount += 1;
    if (option.supportGain) {
      regent.supportTokens += option.supportGain;
    }

    const record: RoundRecord = {
      roundNumber: this.roundNumber,
      crisisCardId: this.currentCrisis.id,
      regentPlayerId: this.regentPlayerId,
      votes: { ...this.currentVotes },
      chosenOptionId: resolution.chosenOptionId,
      resourceDeltaApplied: option.effects,
      powerActions: this.currentPowerActions,
    };
    this.rounds.push(record);

    if (!this.collapsed && ResourceManager.isCollapsed(this.resources, this.config.collapseThreshold)) {
      this.collapsed = true;
      this.collapsedAtRound = this.roundNumber;
    }

    this.transitionTo(GamePhase.RESOLUTION);
    this.emit('roundResolved', { record, resources: { ...this.resources }, resolution });

    if (this.collapsed) {
      this.endGame();
    }
  }

  // ==========================================================================
  // Connexion / deconnexion (les votes/pouvoirs manquants deviennent des
  // abstentions, la partie ne reste jamais bloquee sur un joueur absent)
  // ==========================================================================

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.assertPlayerExists(playerId);
    player.connected = connected;
  }

  // ==========================================================================
  // Lecture d'etat
  // ==========================================================================

  getPhase(): GamePhase {
    return this.phase;
  }

  getPublicState(): PublicGameState {
    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      totalRounds: this.config.totalRounds,
      resources: { ...this.resources },
      regentPlayerId: this.regentPlayerId,
      currentCrisis: this.currentCrisis ?? undefined,
      players: this.seatOrder.map((id) => {
        const p = this.players.get(id)!;
        return {
          id: p.id,
          seatIndex: p.seatIndex,
          displayName: p.displayName,
          connected: p.connected,
          isRegent: id === this.regentPlayerId,
          hasAccused: p.hasAccused,
          revealedAllegiance: p.revealed ? p.allegiance : undefined,
        };
      }),
    };
  }

  getPrivateStateFor(playerId: string): PrivatePlayerState {
    const player = this.assertPlayerExists(playerId);
    const objective = this.objectivePoolById.get(player.secretObjectiveId)!;
    const role = this.rolePoolById.get(player.roleId)!;
    return {
      playerId,
      allegiance: player.allegiance,
      role,
      secretObjective: objective,
      powers: player.powers.map((p) => ({ ...p })),
      supportTokens: player.supportTokens,
      hasAccused: player.hasAccused,
      regenciesTotal: regenciesForSeat(player.seatIndex, this.seatOrder.length, this.config.totalRounds),
      claimantTokensRequired: claimantTokensRequired(
        player.seatIndex,
        this.seatOrder.length,
        this.config.totalRounds,
        this.config.claimantSupportThresholdRatio,
      ),
      // N'a de sens que pendant un second tour en cours : l'option a ne pas reprendre.
      revoteBlockedOptionId:
        this.phase === GamePhase.VOTE && this.revoteConsumedThisRound
          ? this.revoteBlockedByPlayer[playerId]
          : undefined,
    };
  }

  getRoundHistory(): RoundRecord[] {
    return this.rounds.map((r) => ({ ...r, votes: { ...r.votes } }));
  }

  getAccusations(): AccusationRecord[] {
    return this.accusations.map((a) => ({ ...a }));
  }

  /**
   * Cartes pas encore piochees, dans leur ordre de tirage garanti pour la
   * suite de la partie. Ne mute rien. Utilise par le systeme d'equilibrage
   * pour verifier la solvabilite d'une partie avant de la proposer aux
   * joueurs (cf. balance/SolvabilityChecker). NE JAMAIS exposer aux clients.
   */
  peekUpcomingCrises(): CrisisCard[] {
    return this.deck.peekRemaining();
  }

  isGameOver(): boolean {
    return this.phase === GamePhase.GAME_END;
  }

  getFinalResult(): GameResult {
    if (this.phase !== GamePhase.GAME_END || !this.result) {
      throw new InvalidPhaseTransitionError("La partie n'est pas terminee");
    }
    return this.result;
  }

  // ==========================================================================
  // Aides internes
  // ==========================================================================

  private pickNextRegent(): string {
    if (!this.regentPlayerId) return this.seatOrder[0];
    const currentIndex = this.seatOrder.indexOf(this.regentPlayerId);
    const nextIndex = (currentIndex + 1) % this.seatOrder.length;
    return this.seatOrder[nextIndex];
  }

  private assertPhase(expected: GamePhase | GamePhase[]): void {
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(this.phase)) {
      throw new InvalidPhaseTransitionError(`Action invalide en phase ${this.phase} (attendu: ${allowed.join(', ')})`);
    }
  }

  private assertPlayerExists(playerId: string): PlayerRuntime {
    const player = this.players.get(playerId);
    if (!player) {
      throw new UnauthorizedActionError(`Joueur inconnu: ${playerId}`);
    }
    return player;
  }
}
