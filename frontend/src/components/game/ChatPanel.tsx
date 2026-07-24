import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../types/game';

interface ChatPanelProps {
  messages: ChatMessage[];
  ownPlayerId: string | null;
  onSend: (text: string) => void;
  onClose: () => void;
}

/** Messagerie du Conseil (bottom sheet) — le canal officiel de la phase de negociation. */
export function ChatPanel({ messages, ownPlayerId, onSend, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Messages du Conseil">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-t-3xl bg-slate-900 border-t border-slate-700 flex flex-col h-[70dvh]">
        <div className="px-5 pt-3 pb-2 border-b border-slate-800">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-700" aria-hidden />
          <h2 className="mt-3 text-base font-bold text-slate-100">Messages du Conseil</h2>
          <p className="text-xs text-slate-500">Visible par toute la table — négociez, mentez, promettez.</p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && <p className="text-center text-sm text-slate-600 mt-8">Aucun message pour l'instant.</p>}
          {messages.map((m, i) => {
            const own = m.playerId === ownPlayerId;
            return (
              <div key={`${m.ts}-${i}`} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    own ? 'bg-amber-400/15 border border-amber-400/30' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {!own && <p className="text-[11px] font-bold text-amber-300">{m.from}</p>}
                  <p className="text-sm text-slate-100 break-words">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            maxLength={300}
            placeholder="Ton message au Conseil…"
            className="flex-1 min-h-12 rounded-xl bg-slate-800 border border-slate-700 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="min-h-12 px-4 rounded-xl bg-amber-400 text-slate-900 font-bold disabled:opacity-40"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
