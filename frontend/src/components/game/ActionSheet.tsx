import { useState } from 'react';
import type { PrivatePlayerState, PublicPlayerView, SpyResultPayload } from '../../types/game';
import { PrimaryButton } from '../ui/PrimaryButton';
import { ALLEGIANCE_LABELS, POWER_LABELS, POWER_NEEDS_TARGET } from '../../lib/labels';

interface ActionSheetProps {
  privateState: PrivatePlayerState;
  players: PublicPlayerView[];
  ownPlayerId: string;
  isRegent: boolean;
  phase: 'NEGOTIATION' | 'POWERS';
  spyResults: SpyResultPayload[];
  onUsePower: (power: PrivatePlayerState['powers'][0]['type'], targetPlayerId?: string) => Promise<string | null>;
  onAccuse: (targetPlayerId: string) => Promise<string | null>;
  onClose: () => void;
}

/**
 * Actions secretes et publiques de la manche : utiliser son pouvoir (phase
 * POUVOIRS uniquement) et accuser (negociation ou pouvoirs). Le choix de
 * cible passe par une liste dediee — jamais de tap direct sur les avatars,
 * trop risque sur mobile.
 */
export function ActionSheet({
  privateState,
  players,
  ownPlayerId,
  isRegent,
  phase,
  spyResults,
  onUsePower,
  onAccuse,
  onClose,
}: ActionSheetProps) {
  const [picking, setPicking] = useState<'power' | 'accuse' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'power' | 'accuse' | null>(null);

  const power = privateState.powers[0];
  const powerMeta = power ? POWER_LABELS[power.type] : null;
  const powerUsable =
    phase === 'POWERS' &&
    power !== undefined &&
    power.usesRemaining > 0 &&
    (power.type !== 'BOOST_REGENT' || isRegent) &&
    done !== 'power';
  const targets = players.filter((p) => p.id !== ownPlayerId);

  async function firePower(targetId?: string) {
    setBusy(true);
    setFeedback(null);
    const error = await onUsePower(power!.type, targetId);
    setBusy(false);
    setPicking(null);
    if (error) {
      setFeedback(error);
    } else {
      setDone('power');
      setFeedback('Pouvoir activé — il sera résolu à la fin de la phase.');
    }
  }

  async function fireAccuse(targetId: string) {
    setBusy(true);
    setFeedback(null);
    const error = await onAccuse(targetId);
    setBusy(false);
    setPicking(null);
    if (error) {
      setFeedback(error);
    } else {
      setDone('accuse');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Actions">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-t-3xl bg-slate-900 border-t border-slate-700 px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] max-h-[85dvh] overflow-y-auto">
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-700" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-slate-50">Actions</h2>

        {feedback && (
          <p role="status" className="mt-3 rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 text-sm text-slate-200">
            {feedback}
          </p>
        )}

        {picking === null && (
          <div className="mt-4 space-y-3">
            {/* Pouvoir */}
            <div className="rounded-2xl bg-slate-800/70 border border-slate-700 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {powerMeta?.name ?? 'Pouvoir'} · {power?.usesRemaining ?? 0} usage(s)
              </p>
              <p className="mt-1 text-sm text-slate-300">{powerMeta?.description}</p>
              {phase !== 'POWERS' && (
                <p className="mt-2 text-xs text-slate-500">Utilisable pendant la phase Pouvoirs.</p>
              )}
              {phase === 'POWERS' && power && power.type === 'BOOST_REGENT' && !isRegent && (
                <p className="mt-2 text-xs text-slate-500">Réservé au Régent en exercice.</p>
              )}
              <PrimaryButton
                className="mt-3"
                disabled={!powerUsable || busy}
                onClick={() => (POWER_NEEDS_TARGET[power!.type] ? setPicking('power') : void firePower())}
              >
                {done === 'power' ? 'Pouvoir activé ✓' : 'Utiliser mon pouvoir'}
              </PrimaryButton>
            </div>

            {/* Accusation */}
            <div className="rounded-2xl bg-red-950/40 border border-red-900 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-300">Accusation publique</p>
              <p className="mt-1 text-sm text-slate-300">
                Une seule fois par partie : désigne un Agent étranger devant le Conseil. Si tu vises juste, il est
                démasqué. Sinon, c'est <span className="font-semibold">ta</span> propre allégeance qui est révélée.
              </p>
              <PrimaryButton
                variant="secondary"
                className="mt-3"
                disabled={privateState.hasAccused || done === 'accuse' || busy}
                onClick={() => setPicking('accuse')}
              >
                {privateState.hasAccused || done === 'accuse' ? 'Accusation déjà utilisée' : 'Accuser un joueur…'}
              </PrimaryButton>
            </div>

            {/* Renseignements d'espionnage deja obtenus */}
            {spyResults.filter((r) => r.type === 'SPY_RESULT').length > 0 && (
              <div className="rounded-2xl bg-slate-800/70 border border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tes renseignements</p>
                <ul className="mt-1 space-y-1">
                  {spyResults.map((r, i) =>
                    r.type === 'SPY_RESULT' ? (
                      <li key={i} className="text-sm text-slate-200">
                        {players.find((p) => p.id === r.targetPlayerId)?.displayName ?? '???'} est{' '}
                        <span className="font-bold text-amber-300">{ALLEGIANCE_LABELS[r.allegiance]}</span>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {picking !== null && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-200">
              {picking === 'power' ? `Cible de « ${powerMeta?.name} » :` : 'Qui accuses-tu d\'être un Agent étranger ?'}
            </p>
            <ul className="mt-3 space-y-2">
              {targets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (picking === 'power' ? void firePower(p.id) : void fireAccuse(p.id))}
                    className="w-full min-h-14 rounded-xl bg-slate-800 border border-slate-600 px-4 text-left font-medium text-slate-100 active:bg-slate-700 disabled:opacity-40"
                  >
                    {p.displayName}
                    {!p.connected && <span className="text-xs text-slate-500"> (déconnecté)</span>}
                    {p.revealedAllegiance && (
                      <span className="text-xs text-red-300"> — {ALLEGIANCE_LABELS[p.revealedAllegiance]} révélé</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <PrimaryButton variant="ghost" className="mt-3" onClick={() => setPicking(null)} disabled={busy}>
              ← Annuler
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
