import type { CrisisCard, PublicPlayerView, ResourceKey, RoundPayload } from '../../types/game';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  treasury: 'Trésor',
  stability: 'Stabilité',
  army: 'Armée',
  faith: 'Foi',
};

interface RoundSummaryProps {
  round: RoundPayload;
  crisis: CrisisCard | null;
  players: PublicPlayerView[];
}

/** Recap de fin de manche : option retenue, comment, et effets sur le royaume. */
export function RoundSummary({ round, crisis, players }: RoundSummaryProps) {
  const chosen = crisis?.options.find((o) => o.id === round.chosenOptionId);
  const effects = Object.entries(chosen?.effects ?? {}).filter(([, v]) => v !== 0);
  const abstainedNames = round.abstentions
    .map((id) => players.find((p) => p.id === id)?.displayName)
    .filter(Boolean);

  let howLine: string | null = null;
  if (round.wasChosenByLot) howLine = 'Décision tirée au sort (aucune majorité claire).';
  else if (round.wasTieBrokenByRegent) howLine = 'Égalité tranchée par le Régent.';
  else if (round.wasForcedByTimeout) howLine = 'Temps écoulé — votes exprimés comptabilisés.';

  return (
    <div className="rounded-2xl bg-slate-900 border border-amber-400/30 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Décision du Conseil</p>
      <h3 className="mt-1 text-lg font-bold text-slate-50">{chosen?.label ?? round.chosenOptionId}</h3>
      {howLine && <p className="mt-1 text-xs text-slate-400">{howLine}</p>}

      {effects.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {effects.map(([resource, delta]) => (
            <li
              key={resource}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                (delta as number) > 0
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950/60 text-red-300 border border-red-900'
              }`}
            >
              {RESOURCE_LABELS[resource as ResourceKey] ?? resource} {(delta as number) > 0 ? '+' : ''}
              {delta as number}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-xs text-slate-500 space-y-0.5">
        <p>
          Dépouillement :{' '}
          {Object.entries(round.tally)
            .map(([optionId, count]) => `${crisis?.options.find((o) => o.id === optionId)?.label ?? optionId} — ${count}`)
            .join(' · ')}
        </p>
        {abstainedNames.length > 0 && <p>Abstentions : {abstainedNames.join(', ')}</p>}
      </div>
    </div>
  );
}
