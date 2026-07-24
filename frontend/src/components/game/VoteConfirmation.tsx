interface VoteConfirmationProps {
  optionLabel: string;
  onChange: () => void;
}

/** Confirmation discrete apres un tap — rassure sans occuper l'ecran. */
export function VoteConfirmation({ optionLabel, onChange }: VoteConfirmationProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
      <span className="text-sm text-emerald-300">
        Vote enregistré : <strong>{optionLabel}</strong>
      </span>
      <button type="button" onClick={onChange} className="text-xs font-semibold text-slate-300 underline underline-offset-2 shrink-0">
        Modifier
      </button>
    </div>
  );
}
