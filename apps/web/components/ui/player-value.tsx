import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

export interface PlayerValueProps {
  value: number;
  delta?: number;
  size?: 'sm' | 'lg';
  tone?: 'default' | 'neutral';
}

function resolveTier(value: number) {
  if (value >= 950000) return 'S';
  if (value >= 850000) return 'A';
  if (value >= 750000) return 'B';
  return 'C';
}

export function PlayerValue({
  value,
  delta = 0,
  size = 'lg',
  tone: _tone = 'default',
}: PlayerValueProps) {
  void _tone;
  const tier = resolveTier(value);
  const positive = delta >= 0;

  return (
    <div className="border border-hairline bg-surface p-5">
      <p className="label-mono">Market value</p>
      <p
        className={cn(
          'mt-2 font-display tracking-tight text-foreground tabular-nums',
          size === 'lg' ? 'display-lg' : 'display-md',
        )}
      >
        {formatCurrency(value)}
      </p>
      <div className="mt-3 flex items-center gap-3 label-mono">
        <span className="border border-hairline px-2 py-0.5 text-foreground-dim">
          Tier {tier}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 tabular-nums',
            positive ? 'text-[color:var(--win)]' : 'text-[color:var(--loss)]',
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {positive ? '+' : ''}
          {formatCurrency(delta)}
        </span>
      </div>
    </div>
  );
}
