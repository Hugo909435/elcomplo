import { useState } from 'react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useGameCommands, useGameState } from '../state/GameContext';

/** Salle d'attente : code partageable en gros, liste des joueurs, lancement par l'hote. */
export function LobbyScreen() {
  const { room, playerId } = useGameState();
  const commands = useGameCommands();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!room) return null;
  const me = room.players.find((p) => p.playerId === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = room.players.filter((p) => p.connected).length >= room.minPlayers;

  async function handleStart() {
    setBusy(true);
    setError(null);
    const err = await commands.startGame();
    if (err) setError(err.message);
    setBusy(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room!.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible : le code reste lisible a l'ecran */
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="flex-1 max-w-sm w-full mx-auto flex flex-col">
        <h1 className="text-xl font-bold">Salle du Conseil</h1>
        <p className="text-sm text-slate-400">Partage ce code avec les autres nobles :</p>

        <button
          type="button"
          onClick={copyCode}
          className="mt-3 rounded-2xl bg-slate-900 border border-amber-400/40 py-4 text-center active:scale-[0.99]"
          aria-label={`Code du salon ${room.code.split('').join(' ')}, appuyer pour copier`}
        >
          <span className="text-3xl font-mono font-black tracking-[0.35em] text-amber-300">{room.code}</span>
          <span className="block mt-1 text-xs text-slate-500">{copied ? 'Copié ✓' : 'Appuyer pour copier'}</span>
        </button>

        <div className="mt-6 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Joueurs ({room.players.length}/{room.maxPlayers})
          </p>
          <ul className="mt-2 space-y-2">
            {room.players.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
              >
                <span
                  aria-label={p.connected ? 'connecté' : 'déconnecté'}
                  className={`h-2.5 w-2.5 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
                />
                <span className="flex-1 font-medium truncate">
                  {p.name}
                  {p.playerId === playerId && <span className="text-slate-500"> (toi)</span>}
                </span>
                {p.isHost && <span className="text-xs font-semibold text-amber-300">Hôte</span>}
              </li>
            ))}
          </ul>
          {!canStart && (
            <p className="mt-3 text-sm text-slate-500">
              Encore {Math.max(0, room.minPlayers - room.players.filter((p) => p.connected).length)} joueur(s) pour
              pouvoir lancer.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {isHost ? (
            <PrimaryButton onClick={handleStart} disabled={!canStart || busy}>
              Lancer la partie ({room.players.filter((p) => p.connected).length} joueurs)
            </PrimaryButton>
          ) : (
            <p className="text-center text-sm text-slate-400">En attente du lancement par l'hôte…</p>
          )}
          <PrimaryButton variant="ghost" onClick={() => void commands.leaveRoom()}>
            Quitter le salon
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
