import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'gold';
}

const TONES: Record<NonNullable<ChipProps['tone']>, string> = {
  neutral: 'bg-slate-800 text-slate-200',
  positive: 'bg-emerald-500/15 text-emerald-300',
  negative: 'bg-red-500/15 text-red-300',
  gold: 'bg-amber-400/15 text-amber-300',
};

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
