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
  TOP: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  JG: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  JUNGLE: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  MID: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  ADC: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  SUP: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  SUPPORT: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]',
  S: 'bg-amber-400/[0.08] text-amber-200/90 ring-1 ring-amber-300/[0.14]',
  A: 'bg-violet-400/[0.08] text-violet-200/90 ring-1 ring-violet-300/[0.14]',
  B: 'bg-violet-500/[0.06] text-violet-200/80 ring-1 ring-violet-400/[0.1]',
  C: 'bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.06]',
  actif: 'bg-emerald-500/[0.08] text-emerald-200/90 ring-1 ring-emerald-400/[0.12]',
  expiré: 'bg-rose-500/[0.07] text-rose-200/90 ring-1 ring-rose-400/[0.1]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

export function Badge({ variant, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.06em]',
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {children ?? variant}
    </span>
  );
}
