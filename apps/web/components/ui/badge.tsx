import type { CSSProperties, HTMLAttributes } from 'react';
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

type BadgeKind = 'role' | 'tier' | 'status';

const variantKind: Record<BadgeVariant, BadgeKind> = {
  TOP: 'role',
  JG: 'role',
  JUNGLE: 'role',
  MID: 'role',
  ADC: 'role',
  SUP: 'role',
  SUPPORT: 'role',
  S: 'tier',
  A: 'tier',
  B: 'tier',
  C: 'tier',
  actif: 'status',
  expiré: 'status',
};

const roleColor: Record<BadgeVariant, string | null> = {
  TOP: 'var(--role-top)',
  JG: 'var(--role-jg)',
  JUNGLE: 'var(--role-jg)',
  MID: 'var(--role-mid)',
  ADC: 'var(--role-adc)',
  SUP: 'var(--role-sup)',
  SUPPORT: 'var(--role-sup)',
  S: null,
  A: null,
  B: null,
  C: null,
  actif: null,
  expiré: null,
};

const statusClass: Partial<Record<BadgeVariant, string>> = {
  actif: 'text-[color:var(--win)]',
  expiré: 'text-[color:var(--loss)]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

export function Badge({ variant, className, children, ...props }: BadgeProps) {
  const kind = variantKind[variant];
  const label = children ?? variant;

  if (kind === 'role') {
    const dotColor = roleColor[variant];
    const style: CSSProperties | undefined = dotColor
      ? ({ ['--role-color' as never]: dotColor } as CSSProperties)
      : undefined;

    return (
      <span className={cn('role-pill', className)} style={style} {...props}>
        {label}
      </span>
    );
  }

  if (kind === 'tier') {
    return (
      <span
        className={cn(
          'inline-flex items-center border border-hairline px-2 py-0.5 label-mono',
          className,
        )}
        {...props}
      >
        Tier {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-hairline px-2 py-0.5 label-mono',
        statusClass[variant],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
