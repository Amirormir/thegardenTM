import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant =
  | 'TOP'
  | 'JG'
  | 'JUNGLE'
  | 'MID'
  | 'ADC'
  | 'SUP'
  | 'SUPPORT'
  | 'S'
  | 'A'
  | 'B'
  | 'C'
  | 'actif'
  | 'expiré';

const variantMap: Record<BadgeVariant, string> = {
  TOP: 'bg-sky-500/14 text-sky-200 ring-1 ring-sky-400/24',
  JG: 'bg-emerald-500/14 text-emerald-200 ring-1 ring-emerald-400/24',
  JUNGLE: 'bg-emerald-500/14 text-emerald-200 ring-1 ring-emerald-400/24',
  MID: 'bg-violet-500/14 text-violet-200 ring-1 ring-violet-400/24',
  ADC: 'bg-amber-500/14 text-amber-100 ring-1 ring-amber-400/24',
  SUP: 'bg-fuchsia-500/14 text-fuchsia-200 ring-1 ring-fuchsia-400/24',
  SUPPORT: 'bg-fuchsia-500/14 text-fuchsia-200 ring-1 ring-fuchsia-400/24',
  S: 'glow-gold bg-amber-400/12 text-amber-100 ring-1 ring-amber-300/30',
  A: 'bg-gradient-to-r from-violet-500/22 to-amber-400/18 text-violet-50 ring-1 ring-violet-300/30',
  B: 'bg-violet-500/16 text-violet-100 ring-1 ring-violet-400/24',
  C: 'bg-white/8 text-slate-200 ring-1 ring-white/10',
  actif: 'bg-emerald-500/14 text-emerald-100 ring-1 ring-emerald-400/22',
  expiré: 'bg-rose-500/12 text-rose-100 ring-1 ring-rose-400/20',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

export function Badge({ variant, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]',
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {children ?? variant}
    </span>
  );
}
