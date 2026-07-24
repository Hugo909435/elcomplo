interface VoteProgressIndicatorProps {
  votedCount: number;
  totalCount: number;
}

/** "X/Y ont vote" — jamais qui a vote quoi : le vote reste prive jusqu'a la resolution. */
export function VoteProgressIndicator({ votedCount, totalCount }: VoteProgressIndicatorProps) {
  const ratio = totalCount === 0 ? 0 : votedCount / totalCount;

  return (
    <div className="rounded-xl bg-slate-800/60 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">Votes reçus</span>
        <span className="text-xs font-semibold text-slate-200">
          {votedCount}/{totalCount}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
