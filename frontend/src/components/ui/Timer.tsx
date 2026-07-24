interface TimerProps {
  secondsRemaining: number;
  totalSeconds: number;
}

/** Compte a rebours compact — vire au rouge et pulse dans les 25% de temps restant. */
export function Timer({ secondsRemaining, totalSeconds }: TimerProps) {
  const ratio = totalSeconds > 0 ? Math.max(0, secondsRemaining / totalSeconds) : 0;
  const urgent = ratio <= 0.25;
  const minutes = Math.floor(Math.max(0, secondsRemaining) / 60);
  const seconds = Math.max(0, secondsRemaining) % 60;

  return (
    <div className={`flex items-center gap-2 font-mono text-sm font-semibold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
      <div className="h-1.5 w-16 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-400' : 'bg-amber-400'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
