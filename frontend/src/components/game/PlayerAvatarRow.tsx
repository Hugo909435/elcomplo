import { Avatar } from '../ui/Avatar';
import type { PublicPlayerView } from '../../types/game';

interface PlayerAvatarRowProps {
  players: PublicPlayerView[];
}

/** Bande scrollable horizontalement — jamais plus d'une ligne, meme a 8 joueurs. */
export function PlayerAvatarRow({ players }: PlayerAvatarRowProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
      {players.map((player) => (
        <div key={player.id} className="flex flex-col items-center gap-1 shrink-0">
          <Avatar name={player.displayName} connected={player.connected} isRegent={player.isRegent} />
          <span className="text-[11px] text-slate-400 max-w-14 truncate">{player.displayName}</span>
        </div>
      ))}
    </div>
  );
}
