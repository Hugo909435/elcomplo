import type { Allegiance, PrivatePlayerState } from '../../types/game';
import { POWER_LABELS } from '../../lib/labels';

const ALLEGIANCE_META: Record<Allegiance, { label: string; hint: string; classes: string }> = {
  LOYALIST: {
    label: 'Loyaliste',
    hint: 'Le royaume doit survivre à la succession.',
    classes: 'bg-sky-950/60 border-sky-700 text-sky-200',
  },
  CLAIMANT: {
    label: 'Prétendant',
    hint: 'Accumule des soutiens quand tu es Régent pour prendre la couronne — sans faire sombrer le royaume.',
    classes: 'bg-amber-950/60 border-amber-600 text-amber-200',
  },
  FOREIGN_AGENT: {
    label: 'Agent étranger',
    hint: "Fais s'effondrer le royaume sans jamais être démasqué.",
    classes: 'bg-red-950/60 border-red-700 text-red-200',
  },
};

interface RoleSheetProps {
  privateState: PrivatePlayerState;
  onClose: () => void;
}

/** Bottom sheet du role secret : identite, allegeance, objectif, pouvoir. Jamais visible des autres. */
export function RoleSheet({ privateState, onClose }: RoleSheetProps) {
  const allegiance = ALLEGIANCE_META[privateState.allegiance];
  const power = privateState.powers[0];
  const powerMeta = POWER_LABELS[power?.type ?? ''] ?? { name: power?.type, description: '' };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Ton rôle secret">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-t-3xl bg-slate-900 border-t border-slate-700 px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] max-h-[85dvh] overflow-y-auto">
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-700" aria-hidden />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Ton rôle — garde-le secret</p>
        <h2 className="mt-1 text-2xl font-black text-slate-50">{privateState.role.name}</h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{privateState.role.description}</p>

        <div className={`mt-4 rounded-2xl border px-4 py-3 ${allegiance.classes}`}>
          <p className="text-xs font-bold uppercase tracking-wide">Allégeance : {allegiance.label}</p>
          <p className="mt-1 text-sm">{allegiance.hint}</p>
          {privateState.allegiance === 'CLAIMANT' && (
            <p className="mt-2 text-sm font-semibold">
              Soutiens : {privateState.supportTokens}/{privateState.claimantTokensRequired} requis · {privateState.regenciesTotal} régence(s) dans la partie
            </p>
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-slate-800/70 border border-slate-700 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Objectif secret ({privateState.secretObjective.difficulty})</p>
          <p className="mt-1 text-sm text-slate-200">{privateState.secretObjective.description}</p>
        </div>

        {power && (
          <div className="mt-3 rounded-2xl bg-slate-800/70 border border-slate-700 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pouvoir : {powerMeta.name} · {power.usesRemaining} usage(s) restant(s)
            </p>
            <p className="mt-1 text-sm text-slate-200">{powerMeta.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
