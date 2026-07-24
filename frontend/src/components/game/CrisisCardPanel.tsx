import { useState } from 'react';
import { RegentBadge } from './RegentBadge';
import type { CrisisCard } from '../../types/game';

interface CrisisCardPanelProps {
  crisis: CrisisCard;
  regentName: string;
}

/** Carte de crise du round courant — texte tronque par defaut pour garder l'ecran court. */
export function CrisisCardPanel({ crisis, regentName }: CrisisCardPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = crisis.description.length > 120;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-800/60 border border-slate-700 p-4">
      <RegentBadge regentName={regentName} />
      <h2 className="mt-3 text-xl font-bold text-slate-50">{crisis.title}</h2>
      <p className={`mt-2 text-sm text-slate-300 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>{crisis.description}</p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-xs font-semibold text-amber-300">
          {expanded ? 'Réduire' : 'Lire plus'}
        </button>
      )}
    </div>
  );
}
