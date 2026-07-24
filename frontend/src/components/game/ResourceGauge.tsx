interface ResourceGaugeProps {
  label: string;
  icon: string;
  value: number;
  max?: number;
}

function toneForRatio(ratio: number) {
  if (ratio <= 0.25) return { bar: 'bg-red-400', text: 'text-red-300' };
  if (ratio <= 0.5) return { bar: 'bg-amber-400', text: 'text-amber-300' };
  return { bar: 'bg-emerald-400', text: 'text-emerald-300' };
}

/** Jauge compacte, lisible d'un coup d'oeil (couleur) sans avoir a lire le chiffre. */
export function ResourceGauge({ label, icon, value, max = 10 }: ResourceGaugeProps) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const tone = toneForRatio(ratio);

  return (
    <div className="rounded-xl bg-slate-800/70 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <span aria-hidden>{icon}</span>
          {label}
        </span>
        <span className={`text-sm font-bold tabular-nums ${tone.text}`}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
