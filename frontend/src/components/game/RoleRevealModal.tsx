import type { Allegiance, PrivatePlayerState } from '../../types/game';
import { ALLEGIANCE_ICONS, POWER_LABELS } from '../../lib/labels';
import { PrimaryButton } from '../ui/PrimaryButton';

const ALLEGIANCE_META: Record<Allegiance, { label: string; goal: string; classes: string; accent: string }> = {
  LOYALIST: {
    label: 'Loyaliste',
    goal: 'Ton camp gagne si le royaume survit à la succession.',
    classes: 'from-sky-950 to-slate-950 border-sky-700',
    accent: 'text-sky-300',
  },
  CLAIMANT: {
    label: 'Prétendant',
    goal: 'Empare-toi de la couronne en accumulant des soutiens comme Régent — sans faire tomber le royaume.',
    classes: 'from-amber-950 to-slate-950 border-amber-600',
    accent: 'text-amber-300',
  },
  FOREIGN_AGENT: {
    label: 'Agent étranger',
    goal: "Fais s'effondrer le royaume sans jamais te faire démasquer.",
    classes: 'from-red-950 to-slate-950 border-red-700',
    accent: 'text-red-300',
  },
};

interface RoleRevealModalProps {
  privateState: PrivatePlayerState;
  onDismiss: () => void;
}

/**
 * Révélation plein écran du rôle au lancement de la partie : le joueur doit
 * comprendre d'un coup d'œil qui il est, dans quel camp, avec quel pouvoir et
 * quel objectif — avant de commencer à jouer. Vu une seule fois par partie.
 */
export function RoleRevealModal({ privateState, onDismiss }: RoleRevealModalProps) {
  const meta = ALLEGIANCE_META[privateState.allegiance];
  const power = privateState.powers[0];
  const powerMeta = power ? POWER_LABELS[power.type] : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Ton rôle secret"
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm w-full mx-auto">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Garde-le secret</p>
        <p className="mt-4 text-center text-6xl" aria-hidden>
          {ALLEGIANCE_ICONS[privateState.allegiance]}
        </p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight text-slate-50">{privateState.role.name}</h1>
        <p className={`mt-1 text-center text-sm font-bold uppercase tracking-wide ${meta.accent}`}>{meta.label}</p>

        <div className={`mt-5 rounded-2xl bg-gradient-to-b ${meta.classes} border p-4`}>
          <p className="text-sm text-slate-200 leading-relaxed">{privateState.role.description}</p>
          <p className="mt-3 text-sm font-semibold text-slate-100">{meta.goal}</p>
          {privateState.allegiance === 'CLAIMANT' && (
            <p className="mt-2 text-xs text-slate-300">
              Objectif de couronne : {privateState.claimantTokensRequired} jeton(s) de soutien ·{' '}
              {privateState.regenciesTotal} régence(s) prévue(s) pour toi.
            </p>
          )}
        </div>

        {powerMeta && (
          <div className="mt-3 rounded-2xl bg-slate-900 border border-slate-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Ton pouvoir · {power.usesRemaining} usage{power.usesRemaining > 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-base font-bold text-slate-100">
              <span aria-hidden>{powerMeta.icon}</span> {powerMeta.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{powerMeta.description}</p>
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-slate-900 border border-slate-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Ton objectif secret · {privateState.secretObjective.difficulty}
          </p>
          <p className="mt-1 text-sm text-slate-200">{privateState.secretObjective.description}</p>
        </div>

        <div className="mt-6">
          <PrimaryButton onClick={onDismiss}>J'ai compris — entrer au Conseil</PrimaryButton>
        </div>
        <p className="mt-3 text-center text-xs text-slate-600">
          Tu pourras revoir ton rôle à tout moment via le bouton 🎭.
        </p>
      </div>
    </div>
  );
}
