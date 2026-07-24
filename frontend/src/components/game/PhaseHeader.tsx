import { Timer } from '../ui/Timer';
import type { GamePhase } from '../../types/game';

interface PhaseHeaderProps {
  phase: GamePhase;
  roundNumber: number;
  totalRounds: number;
  secondsRemaining: number;
  totalSeconds: number;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: 'Salon',
  ROLE_ASSIGNMENT: 'Distribution des rôles',
  CRISIS: 'Crise révélée',
  NEGOTIATION: 'Négociation',
  POWERS: 'Pouvoirs',
  VOTE: 'Vote',
  RESOLUTION: 'Résolution',
  GAME_END: 'Fin de partie',
};

/** Barre fixe en haut d'écran : phase courante, manche, minuteur — toujours visible. */
export function PhaseHeader({ phase, roundNumber, totalRounds, secondsRemaining, totalSeconds }: PhaseHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Manche {roundNumber}/{totalRounds}
          </p>
          <p className="text-lg font-bold text-slate-50">{PHASE_LABELS[phase]}</p>
        </div>
        <Timer secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} />
      </div>
    </header>
  );
}
