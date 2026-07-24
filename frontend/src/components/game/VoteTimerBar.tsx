interface VoteTimerBarProps {
  secondsRemaining: number;
  totalSeconds: number;
}

/** Version pleine largeur du minuteur, en tete de l'ecran de vote (moment le plus critique). */
export function VoteTimerBar({ secondsRemaining, totalSeconds }: VoteTimerBarProps) {
  const ratio = totalSeconds > 0 ? Math.max(0, secondsRemaining / totalSeconds) : 0;
  const urgent = ratio <= 0.25;

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs uppercase tracking-wide text-slate-400">Temps restant</span>
        <span className={`font-mono text-sm font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-slate-100'}`}>
          {Math.max(0, secondsRemaining)}s
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-400' : 'bg-amber-400'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
