import { useEffect } from 'react';
import { GameProvider, useGameCommands, useGameState } from './state/GameContext';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultsScreen } from './screens/ResultsScreen';

/**
 * Routeur d'ecran : purement derive de l'etat serveur (statut du salon +
 * presence d'un resultat). Aucune route URL — une partie est un flux continu,
 * la reconnexion restaure l'ecran exact via le snapshot.
 */
function Router() {
  const state = useGameState();
  const commands = useGameCommands();

  // Erreurs serveur ephemeres : on les affiche puis on les efface (toast simple).
  useEffect(() => {
    if (!state.error) return;
    const timer = setTimeout(() => commands.clearError(), 4000);
    return () => clearTimeout(timer);
  }, [state.error, commands]);

  const toast = state.error ? (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-[max(env(safe-area-inset-top),0.5rem)] px-4 pointer-events-none">
      <div role="alert" className="pointer-events-auto rounded-xl bg-red-950/95 border border-red-700 px-4 py-2.5 text-sm text-red-100 shadow-lg max-w-sm">
        {state.error.message}
      </div>
    </div>
  ) : null;

  let screen: React.ReactNode;
  if (state.resuming) {
    screen = (
      <div className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Chargement…</p>
      </div>
    );
  } else if (!state.room) {
    screen = <HomeScreen />;
  } else if (state.result) {
    screen = (
      <ResultsScreen
        result={state.result}
        players={state.publicState?.players ?? []}
        ownPlayerId={state.playerId}
        onLeave={() => void commands.leaveRoom()}
      />
    );
  } else if (state.room.status === 'LOBBY') {
    screen = <LobbyScreen />;
  } else {
    screen = <GameScreen />;
  }

  return (
    <>
      {toast}
      {screen}
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}
