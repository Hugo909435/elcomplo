import { useEffect, useState } from 'react';
import { CrisisCardPanel } from '../components/game/CrisisCardPanel';
import { FloatingActionMenu } from '../components/game/FloatingActionMenu';
import { PhaseHeader } from '../components/game/PhaseHeader';
import { PlayerAvatarRow } from '../components/game/PlayerAvatarRow';
import { ResourceGaugeGrid } from '../components/game/ResourceGaugeGrid';
import { RoundSummary } from '../components/game/RoundSummary';
import { VoteOptionCard } from '../components/game/VoteOptionCard';
import { VoteConfirmation } from '../components/game/VoteConfirmation';
import { VoteProgressIndicator } from '../components/game/VoteProgressIndicator';
import { ActionSheet } from '../components/game/ActionSheet';
import { ChatPanel } from '../components/game/ChatPanel';
import { RoleSheet } from '../components/game/RoleSheet';
import { RoleRevealModal } from '../components/game/RoleRevealModal';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useCountdown, useGameCommands, useGameState } from '../state/GameContext';

type Sheet = 'role' | 'chat' | 'actions' | null;

/**
 * Ecran de jeu unifie : la meme "maison" (ressources, joueurs, crise) reste
 * a l'ecran a toutes les phases ; seul le bloc d'action en bas et les bottom
 * sheets changent. Tout est pilote par l'etat serveur via le contexte.
 */
export function GameScreen() {
  const state = useGameState();
  const commands = useGameCommands();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showReveal, setShowReveal] = useState(false);

  const secondsRemaining = useCountdown(state.phase?.deadlineTs ?? null);

  const priv = state.privateState;
  const roomCode = state.room?.code;
  const revealKey = roomCode ? `leconseil.reveal.${roomCode}` : null;
  const roleId = priv?.role.id;

  // Révélation du rôle : montrée une seule fois par partie (clé sessionStorage
  // par salon), donc pas re-affichée à chaque reconnexion.
  useEffect(() => {
    if (!roleId || !revealKey) return;
    try {
      if (!sessionStorage.getItem(revealKey)) setShowReveal(true);
    } catch {
      setShowReveal(true);
    }
  }, [roleId, revealKey]);

  function dismissReveal() {
    if (revealKey) {
      try {
        sessionStorage.setItem(revealKey, '1');
      } catch {
        /* sessionStorage indisponible : la révélation ne reviendra pas dans cette vue de toute façon */
      }
    }
    setShowReveal(false);
  }

  const pub = state.publicState;
  if (!pub || !state.phase) {
    return (
      <div className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Distribution des rôles…</p>
      </div>
    );
  }

  const phase = state.phase.phase;
  const regent = pub.players.find((p) => p.isRegent);
  const isRegent = regent?.id === state.playerId;
  const me = pub.players.find((p) => p.id === state.playerId);
  const totalSeconds = phaseDuration(phase);

  const crisis = pub.currentCrisis ?? null;
  const options = crisis?.options ?? [];
  const selectedOption = options.find((o) => o.id === state.myVote) ?? null;

  const isHost = state.room?.players.find((p) => p.playerId === state.playerId)?.isHost ?? false;

  function openSheet(next: Sheet) {
    if (next === 'chat') commands.markChatRead();
    setSheet(next);
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col">
      <PhaseHeader
        phase={phase}
        roundNumber={pub.roundNumber}
        totalRounds={pub.totalRounds}
        secondsRemaining={secondsRemaining}
        totalSeconds={totalSeconds}
      />

      {state.connection !== 'online' && (
        <p className="bg-red-950/80 text-red-200 text-center text-xs py-1.5">
          Connexion perdue — reconnexion en cours…
        </p>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40">
        <ResourceGaugeGrid resources={pub.resources} />
        <PlayerAvatarRow players={pub.players} />

        {crisis && phase !== 'RESOLUTION' && (
          <CrisisCardPanel crisis={crisis} regentName={regent?.displayName ?? '—'} />
        )}

        {phase === 'RESOLUTION' && state.round && (
          <RoundSummary round={state.round} crisis={crisis} players={pub.players} />
        )}

        {phase === 'POWERS' && state.powers && state.powers.hiddenActionCount > 0 && (
          <p className="text-center text-xs text-slate-500">
            {state.powers.hiddenActionCount} action(s) secrète(s) se sont jouées dans l'ombre.
          </p>
        )}

        {/* Bloc de vote inline pendant la phase VOTE */}
        {phase === 'VOTE' && crisis && (
          <div className="space-y-3">
            {state.revoteActive ? (
              <div className="rounded-xl bg-amber-950/50 border border-amber-800 px-4 py-3">
                <p className="text-sm font-semibold text-amber-200">Second tour de vote</p>
                <p className="mt-0.5 text-xs text-amber-200/80">
                  Le premier vote était à égalité. Tu ne peux pas reprendre ton choix précédent — change d'option (ou
                  abstiens-toi).
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Ton vote reste secret jusqu'à la résolution.</p>
            )}
            {selectedOption && (
              <VoteConfirmation optionLabel={selectedOption.label} onChange={() => void commands.castVote(selectedOption.id)} />
            )}
            {options.map((option) => {
              const blocked = option.id === priv?.revoteBlockedOptionId;
              return (
                <VoteOptionCard
                  key={option.id}
                  option={option}
                  selected={option.id === state.myVote}
                  disabled={blocked}
                  disabledHint={blocked ? 'Ton choix du premier tour — interdit ce tour-ci' : undefined}
                  onSelect={() => {
                    if (secondsRemaining > 0) void commands.castVote(option.id);
                  }}
                />
              );
            })}
          </div>
        )}

        {phase === 'NEGOTIATION' && (
          <p className="text-center text-sm text-slate-500 py-2">
            Négociez, formez des alliances, mentez. Ouvrez les messages et vos actions via les boutons.
          </p>
        )}
      </main>

      {/* Barre d'action basse contextuelle */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        {phase === 'VOTE' && (
          <VoteProgressIndicator
            votedCount={state.voteProgress?.votedCount ?? 0}
            totalCount={state.voteProgress?.totalPlayers ?? pub.players.length}
          />
        )}
        {phase === 'NEGOTIATION' && me?.connected && (
          <PrimaryButton onClick={() => openSheet('actions')}>Actions & accusation</PrimaryButton>
        )}
        {phase === 'POWERS' && me?.connected && (
          <div className="space-y-2">
            <p className="text-center text-xs text-slate-400">
              {(state.powersProgress?.readyCount ?? 0)}/{state.powersProgress?.totalPlayers ?? pub.players.length} joueur(s)
              prêt(s) — le vote s'ouvre dès que tout le monde a agi.
            </p>
            {state.powersActed ? (
              <p className="text-center text-sm text-emerald-300 py-2">✓ Tu as joué — en attente des autres…</p>
            ) : (
              <div className="flex gap-2">
                <PrimaryButton className="flex-1" fullWidth={false} onClick={() => openSheet('actions')}>
                  Mon pouvoir / Accuser
                </PrimaryButton>
                <PrimaryButton
                  className="flex-1"
                  fullWidth={false}
                  variant="secondary"
                  onClick={() => void commands.passPowers()}
                >
                  Passer le tour
                </PrimaryButton>
              </div>
            )}
          </div>
        )}
        {(phase === 'CRISIS' || phase === 'RESOLUTION') && isHost && (
          <PrimaryButton variant="secondary" onClick={() => void commands.hostContinue()}>
            {phase === 'CRISIS' ? 'Ouvrir la négociation' : 'Manche suivante'}
          </PrimaryButton>
        )}
        {(phase === 'CRISIS' || phase === 'RESOLUTION') && !isHost && (
          <p className="text-center text-sm text-slate-500">En attente de l'hôte…</p>
        )}
      </div>

      <FloatingActionMenu
        actions={[
          { key: 'role', icon: '🎭', label: 'Rôle secret', onClick: () => openSheet('role') },
          { key: 'chat', icon: '✉️', label: 'Messages', badgeCount: state.unreadChat, onClick: () => openSheet('chat') },
        ]}
      />

      {sheet === 'role' && priv && <RoleSheet privateState={priv} onClose={() => setSheet(null)} />}
      {sheet === 'chat' && (
        <ChatPanel
          messages={state.chat}
          ownPlayerId={state.playerId}
          onSend={commands.sendChat}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'actions' && priv && (phase === 'NEGOTIATION' || phase === 'POWERS') && (
        <ActionSheet
          privateState={priv}
          players={pub.players}
          ownPlayerId={state.playerId!}
          isRegent={isRegent}
          phase={phase}
          spyResults={state.spyResults}
          onUsePower={async (power, target) => (await commands.usePower(power, target))?.message ?? null}
          onAccuse={async (target) => (await commands.accuse(target))?.message ?? null}
          onClose={() => setSheet(null)}
        />
      )}

      {showReveal && priv && <RoleRevealModal privateState={priv} onDismiss={dismissReveal} />}
    </div>
  );
}

/** Durees miroir de PHASE_DURATIONS_MS cote serveur — sert uniquement a dimensionner la barre de progression. */
function phaseDuration(phase: string): number {
  switch (phase) {
    case 'CRISIS':
      return 8;
    case 'NEGOTIATION':
      return 90;
    case 'POWERS':
      return 30;
    case 'VOTE':
      return 25;
    case 'RESOLUTION':
      return 12;
    default:
      return 1;
  }
}
