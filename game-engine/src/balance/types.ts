import { CrisisCard, GameConfig, SecretObjective } from '../types';

export type BalanceIssueCode =
  | 'ASSASSIN_TOO_STRONG'
  | 'ASSASSIN_TOO_WEAK'
  | 'HOSTILE_POWER_STACKING'
  | 'KING_UNREACHABLE'
  | 'KING_TOO_EASY'
  | 'MISSING_REGENT_SLOT'
  | 'ECONOMY_UNRECOVERABLE'
  | 'WAR_UNWINNABLE'
  | 'CROSS_RESOURCE_CONFLICT'
  | 'INSUFFICIENT_RESCUE_CARDS';

export interface BalanceIssue {
  code: BalanceIssueCode;
  severity: 'BLOCKING' | 'WARNING';
  message: string;
  details?: Record<string, unknown>;
}

export interface RolePowerReport {
  playerId: string;
  allegiance: string;
  powerIndex: number;
}

export interface ElectabilityReport {
  claimantPlayerId: string;
  expectedRegentTurns: number;
  requiredSupportThreshold: number;
  maxAchievableSupport: number;
  electabilityIndex: number;
}

export interface SolvabilityReport {
  canAvoidCollapse: boolean;
  canAchieveFullSurvival: boolean;
  examplePath?: string[]; // sequence "crisisCode:optionId" menant a la survie
  worstResourceMargin: Record<string, number>;
}

export interface BalanceReport {
  passed: boolean;
  issues: BalanceIssue[];
  rolePower: RolePowerReport[];
  electability: ElectabilityReport;
  solvability: SolvabilityReport;
  attemptsUsed: number;
  seedUsed: number;
}

export interface PartyGenerationRequest {
  players: Array<{ id: string; displayName: string }>;
  /** Surcharge partielle de config ; le generateur ajuste totalRounds/seuils si necessaire. */
  config?: Partial<GameConfig>;
  crisisPool?: CrisisCard[];
  objectivePool?: SecretObjective[];
  /** Graine de depart ; le generateur en essaie d'autres si necessaire. */
  rngSeed?: number;
}
