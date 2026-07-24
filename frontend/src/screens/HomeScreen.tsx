import { useState } from 'react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { RulesSheet, RolesSheet } from '../components/HelpSheets';
import { useGameCommands, useGameState } from '../state/GameContext';

/** Accueil : creer un salon ou rejoindre avec un code — le nom d'abord, une seule saisie. */
export function HomeScreen() {
  const { connection } = useGameState();
  const commands = useGameCommands();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [help, setHelp] = useState<'rules' | 'roles' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length >= 2;
  const offline = connection !== 'online';

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const err = await commands.createRoom(name.trim());
    if (err) setError(err.message);
    setBusy(false);
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    const err = await commands.joinRoom(code.trim().toUpperCase(), name.trim());
    if (err) setError(err.message);
    setBusy(false);
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 overflow-y-auto px-6 pt-[max(env(safe-area-inset-top),1.75rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <div className="max-w-sm w-full mx-auto">
        <p className="text-center text-4xl" aria-hidden>
          👑
        </p>
        <h1 className="mt-2 text-center text-3xl font-black tracking-tight">Le Conseil</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Le roi est mort. 3 à 8 nobles gèrent le royaume pendant la succession.
        </p>

        {/* L'essentiel, tout de suite : quel genre de jeu, comment on gagne. */}
        <div className="mt-5 rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-sm text-slate-200">
            Tu reçois un <strong className="text-amber-300">rôle secret</strong> qui te place dans l'un des 3 camps.{' '}
            <strong>Ce n'est pas deux équipes face à face</strong> : tu joues pour ton camp, en cachant ton jeu — et
            plusieurs joueurs peuvent l'emporter.
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">On gagne comment ? 3 voies</p>
          <ul className="mt-2 space-y-2">
            <li className="flex items-start gap-2.5 rounded-xl bg-sky-950/40 border border-sky-800 px-3 py-2">
              <span className="text-lg leading-none" aria-hidden>🛡️</span>
              <span className="text-sm">
                <strong className="text-sky-200">Loyalistes</strong> — faire <strong>survivre</strong> le royaume
                jusqu'au bout.
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-xl bg-amber-950/40 border border-amber-800 px-3 py-2">
              <span className="text-lg leading-none" aria-hidden>👑</span>
              <span className="text-sm">
                <strong className="text-amber-200">Prétendant</strong> — s'emparer de la <strong>couronne</strong> en
                gagnant des soutiens, sans faire tomber le royaume.
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-900 px-3 py-2">
              <span className="text-lg leading-none" aria-hidden>🗡️</span>
              <span className="text-sm">
                <strong className="text-red-200">Agent étranger</strong> — faire <strong>s'effondrer</strong> le
                royaume sans se faire démasquer.
              </span>
            </li>
          </ul>
          <p className="mt-2.5 text-xs text-slate-500">
            En plus, chacun a un objectif personnel secret. Les Loyalistes sont majoritaires.
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setHelp('rules')}
            className="flex-1 min-h-11 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-slate-200 active:bg-slate-800"
          >
            📖 Règles complètes
          </button>
          <button
            type="button"
            onClick={() => setHelp('roles')}
            className="flex-1 min-h-11 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-slate-200 active:bg-slate-800"
          >
            🎭 Les 15 rôles
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ton nom de noble</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="ex. Béatrix de Hauteville"
            autoComplete="nickname"
            className="mt-1.5 w-full min-h-14 rounded-2xl bg-slate-900 border border-slate-700 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
          />
        </label>

        {mode === 'join' && (
          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Code du salon</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoCorrect="off"
              className="mt-1.5 w-full min-h-14 rounded-2xl bg-slate-900 border border-slate-700 px-4 text-2xl tracking-[0.3em] font-mono text-center text-slate-100 placeholder:text-slate-700 placeholder:tracking-[0.3em] focus:outline-none focus:border-amber-400"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {offline && (
          <p className="mt-4 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-slate-400">
            Connexion au serveur en cours…
          </p>
        )}

        <div className="mt-6 space-y-3">
          {mode === 'menu' ? (
            <>
              <PrimaryButton onClick={handleCreate} disabled={!nameValid || busy || offline}>
                Créer un salon
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setMode('join')} disabled={busy}>
                Rejoindre avec un code
              </PrimaryButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={handleJoin} disabled={!nameValid || code.trim().length !== 6 || busy || offline}>
                Rejoindre le salon
              </PrimaryButton>
              <PrimaryButton variant="ghost" onClick={() => setMode('menu')} disabled={busy}>
                ← Retour
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {help === 'rules' && <RulesSheet onClose={() => setHelp(null)} />}
      {help === 'roles' && <RolesSheet onClose={() => setHelp(null)} />}
    </div>
  );
}
