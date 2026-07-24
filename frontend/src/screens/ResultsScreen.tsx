import type { GameResult, PlayerScore, PublicPlayerView } from '../types/game';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ALLEGIANCE_ICONS } from '../lib/labels';

const VICTORY_META: Record<GameResult['victories'][0]['type'], { title: string; icon: string }> = {
  KINGDOM_SURVIVES: { title: 'Le royaume survit', icon: '🏰' },
  CLAIMANT_CROWNED: { title: 'Un Prétendant est couronné', icon: '👑' },
  FOREIGN_AGENT_COLLAPSE: { title: "L'Agent étranger triomphe dans l'ombre", icon: '🗡️' },
  KINGDOM_COLLAPSED_NO_AGENT: { title: "Le royaume s'effondre — personne ne gagne", icon: '💀' },
};

const ALLEGIANCE_LABELS: Record<string, string> = {
  LOYALIST: 'Loyaliste',
  CLAIMANT: 'Prétendant',
  FOREIGN_AGENT: 'Agent étranger',
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface ResultsScreenProps {
  result: GameResult;
  players: PublicPlayerView[];
  ownPlayerId: string | null;
  onLeave: () => void;
}

/** Fin de partie : classement (qui gagne), verdict perso, camps, révélation des rôles. */
export function ResultsScreen({ result, players, ownPlayerId, onLeave }: ResultsScreenProps) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.displayName ?? '???';
  const objectiveOf = (id: string) => result.objectiveResults.find((o) => o.playerId === id);

  const winners = result.winnerPlayerIds;
  const myScore = result.scoreboard.find((s) => s.playerId === ownPlayerId);
  const iWon = ownPlayerId !== null && winners.includes(ownPlayerId);

  // Bandeau de tête : qui gagne, formulé clairement.
  const headline =
    winners.length === 0
      ? 'Aucun vainqueur — le chaos l\'emporte'
      : winners.length === 1
        ? `${nameOf(winners[0])} remporte la partie !`
        : `Victoire partagée : ${winners.map(nameOf).join(', ')}`;

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 overflow-y-auto px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="max-w-sm w-full mx-auto">
        {/* Bandeau vainqueur */}
        <div
          className={`rounded-2xl border p-5 text-center ${
            winners.length === 0
              ? 'bg-slate-900 border-slate-700'
              : 'bg-gradient-to-b from-amber-500/20 to-slate-950 border-amber-400/50'
          }`}
        >
          <p className="text-5xl" aria-hidden>
            {winners.length === 0 ? '💀' : '🏆'}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight">{headline}</h1>
          {ownPlayerId !== null && myScore && (
            <p className={`mt-2 text-sm font-semibold ${iWon ? 'text-amber-300' : 'text-slate-400'}`}>
              {iWon ? 'Tu as gagné' : 'Tu n\'as pas gagné'} · {myScore.total} pt{myScore.total > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Classement */}
        <h2 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Classement</h2>
        <ol className="mt-2 space-y-2">
          {result.scoreboard.map((score) => (
            <ScoreRow
              key={score.playerId}
              score={score}
              name={nameOf(score.playerId)}
              isMe={score.playerId === ownPlayerId}
            />
          ))}
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          Barème : victoire de camp = 2 pts · objectif secret réussi = 1 pt.
        </p>

        {/* Comment le royaume a fini + victoires de camp */}
        <h2 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Le sort du royaume</h2>
        <p className="mt-1 text-sm text-slate-400">
          {result.kingdomSurvived
            ? 'Le royaume a traversé la succession sans sombrer.'
            : `Le royaume s'est effondré${result.collapsedAtRound ? ` à la manche ${result.collapsedAtRound}` : ''}.`}
        </p>
        <div className="mt-2 space-y-2">
          {result.victories.map((v, i) => (
            <div key={i} className="rounded-xl bg-amber-400/10 border border-amber-400/30 px-4 py-2.5">
              <p className="text-sm font-bold text-amber-200">
                <span aria-hidden>{VICTORY_META[v.type].icon}</span> {VICTORY_META[v.type].title}
              </p>
              {v.playerIds.length > 0 && <p className="mt-0.5 text-xs text-slate-300">{v.playerIds.map(nameOf).join(', ')}</p>}
            </div>
          ))}
          {result.victories.length === 0 && (
            <p className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-400">
              Aucun camp n'a atteint son objectif collectif.
            </p>
          )}
        </div>

        {/* Révélation des rôles */}
        <h2 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Les visages tombent</h2>
        <ul className="mt-2 space-y-2">
          {result.finalRoles.map((r) => {
            const objective = objectiveOf(r.playerId);
            return (
              <li key={r.playerId} className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
                <span className="text-lg" aria-hidden>
                  {ALLEGIANCE_ICONS[r.allegiance]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {nameOf(r.playerId)}
                    {r.playerId === ownPlayerId && <span className="text-slate-500"> (toi)</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.roleName} · {ALLEGIANCE_LABELS[r.allegiance]}
                  </p>
                </div>
                <span className={`text-xs font-bold ${objective?.achieved ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {objective?.achieved ? 'Objectif ✓' : 'Objectif ✗'}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <PrimaryButton onClick={onLeave}>Retour à l'accueil</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ score, name, isMe }: { score: PlayerScore; name: string; isMe: boolean }) {
  const medal = RANK_MEDAL[score.rank];
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        score.isWinner ? 'bg-amber-400/10 border-amber-400/40' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <span className="w-7 text-center text-lg font-bold tabular-nums" aria-hidden>
        {medal ?? score.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">
          {name}
          {isMe && <span className="text-slate-500"> (toi)</span>}
        </p>
        <p className="text-xs text-slate-500">
          {score.campPoints > 0 ? 'Camp gagnant' : 'Camp perdant'}
          {score.objectivePoints > 0 ? ' · objectif ✓' : ''}
        </p>
      </div>
      <span className={`text-lg font-black tabular-nums ${score.isWinner ? 'text-amber-300' : 'text-slate-300'}`}>
        {score.total}
        <span className="text-xs font-semibold text-slate-500"> pt{score.total > 1 ? 's' : ''}</span>
      </span>
    </li>
  );
}
