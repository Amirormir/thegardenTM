import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

export interface PlayerValueProps {
  value: number;
  delta?: number;
  size?: 'sm' | 'lg';
  tone?: 'default' | 'neutral';
}

function resolveTier(value: number) {
  if (value >= 950000) {
    return 'S';
  }
  if (value >= 850000) {
    return 'A';
  }
  if (value >= 750000) {
    return 'B';
  }
  return 'C';
}

export function PlayerValue({
  value,
  delta = 0,
  size = 'lg',
  tone = 'default',
}: PlayerValueProps) {
  const tier = resolveTier(value);

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        tone === 'default' && tier === 'S' && 'border-amber-300/[0.1] bg-amber-400/[0.04]',
        tone === 'default' && tier === 'A' && 'border-violet-300/[0.1] bg-violet-400/[0.04]',
        tone === 'default' && (tier === 'B' || tier === 'C') && 'border-white/[0.05] bg-white/[0.03]',
        tone === 'neutral' && 'border-white/[0.05] bg-white/[0.03]',
      )}
    >
      <div className="text-kicker">Market Value</div>
      <div
        className={cn(
          'mt-2 font-display font-bold tracking-tight text-white tabular-nums',
          size === 'lg' ? 'text-2xl md:text-3xl' : 'text-xl',
        )}
      >
        {formatCurrency(value)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
        <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.04em] text-white/80">
          Tier {tier}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium tabular-nums',
            delta >= 0 ? 'text-emerald-300' : 'text-rose-300',
          )}
        >
          <ArrowUpRight className={cn('h-3.5 w-3.5', delta < 0 && 'rotate-90')} />
          {delta >= 0 ? '+' : ''}
          {formatCurrency(delta)}
        </span>
      </div>
    </div>
  );
}
