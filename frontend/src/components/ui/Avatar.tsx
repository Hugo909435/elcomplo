interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  connected?: boolean;
  isRegent?: boolean;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export function Avatar({ name, size = 'md', connected = true, isRegent = false }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="relative shrink-0">
      <div
        className={[
          SIZES[size],
          'rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700',
          'flex items-center justify-center font-bold text-white ring-2',
          isRegent ? 'ring-amber-400' : 'ring-slate-700',
        ].join(' ')}
      >
        {initial}
      </div>
      {isRegent && (
        <span className="absolute -top-1.5 -right-1 text-sm" aria-label="Régent">
          👑
        </span>
      )}
      <span
        className={[
          'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900',
          connected ? 'bg-emerald-400' : 'bg-slate-500',
        ].join(' ')}
        aria-label={connected ? 'connecté' : 'déconnecté'}
      />
    </div>
  );
}
