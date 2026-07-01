import { cn } from '@/lib/utils/cn';

export interface RatingBadgeProps {
  /** Note de performance /100, ou null si la game n'a pas été notée. */
  note: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Palier visuel de la note (aligné sur l'échelle de la spec : 100 = MVP quasi parfait). */
function toneClasses(note: number): string {
  if (note >= 80) return 'text-[color:var(--accent-gold)] border-l-[color:var(--accent-gold)]';
  if (note >= 60) return 'text-[color:var(--win)] border-l-[color:var(--win)]';
  if (note >= 40) return 'text-foreground border-l-hairline';
  return 'text-[color:var(--loss)] border-l-[color:var(--loss)]';
}

const SIZE_CLASSES: Record<NonNullable<RatingBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-lg px-3 py-1.5',
};

export function RatingBadge({ note, size = 'sm', className }: RatingBadgeProps) {
  if (note === null || note === undefined) {
    return <span className="label-mono text-foreground-muted">—</span>;
  }

  return (
    <span
      title="Note de performance /100"
      className={cn(
        'inline-flex items-baseline gap-0.5 border border-hairline border-l-2 bg-background font-display tabular-nums',
        SIZE_CLASSES[size],
        toneClasses(note),
        className,
      )}
    >
      {note.toFixed(1)}
      <span className="label-mono text-foreground-muted">/100</span>
    </span>
  );
}
