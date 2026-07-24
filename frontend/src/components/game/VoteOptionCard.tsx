import type { CrisisOption } from '../../types/game';

interface VoteOptionCardProps {
  option: CrisisOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Raison affichée quand l'option est désactivée (ex. second tour de vote). */
  disabledHint?: string;
}

/** Grande carte tactile — 2 ou 3 remplissent l'ecran, aucune ne demande de viser un petit bouton. */
export function VoteOptionCard({ option, selected, onSelect, disabled = false, disabledHint }: VoteOptionCardProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'w-full text-left rounded-2xl border-2 p-4 min-h-20 flex items-center justify-between gap-3',
        'transition-colors',
        disabled
          ? 'border-slate-800 bg-slate-900/40 opacity-50 cursor-not-allowed'
          : selected
            ? 'border-amber-400 bg-amber-400/10 active:scale-[0.98]'
            : 'border-slate-700 bg-slate-800/60 active:scale-[0.98]',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className={`text-base font-semibold ${disabled ? 'text-slate-500 line-through' : 'text-slate-50'}`}>
          {option.label}
        </span>
        {disabled && disabledHint && <span className="block text-xs text-slate-500 no-underline">{disabledHint}</span>}
      </span>
      <span
        className={[
          'h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-bold',
          selected && !disabled ? 'border-amber-400 bg-amber-400 text-slate-900' : 'border-slate-500 text-transparent',
        ].join(' ')}
        aria-hidden
      >
        ✓
      </span>
    </button>
  );
}
