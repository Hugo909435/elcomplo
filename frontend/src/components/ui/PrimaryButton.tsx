import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const VARIANTS: Record<NonNullable<PrimaryButtonProps['variant']>, string> = {
  primary: 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20 active:bg-amber-300',
  secondary: 'bg-slate-800 text-slate-100 border border-slate-600 active:bg-slate-700',
  ghost: 'bg-transparent text-slate-200 active:bg-slate-800/60',
};

/** Bouton d'action primaire — hauteur min 56px pour un tap fiable a une main. */
export function PrimaryButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = true,
  className = '',
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'min-h-14 px-6 rounded-2xl font-semibold text-base transition-colors',
        'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
