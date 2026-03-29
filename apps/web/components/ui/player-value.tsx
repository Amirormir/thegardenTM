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
        'rounded-[24px] border border-white/10 bg-black/20 p-4',
        tone === 'default' && tier === 'S' && 'glow-gold',
        tone === 'default' && tier === 'A' && 'glow-violet',
        tone === 'neutral' && 'bg-white/5 ring-1 ring-white/10',
      )}
    >
      <div className="text-kicker">Market Value</div>
      <div
        className={cn(
          'mt-2 font-mono font-semibold text-white',
          size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl',
        )}
      >
        {formatCurrency(value)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-secondary">
        <span className="rounded-full border border-white/10 px-2 py-1 text-[0.65rem] text-white">
          Tier {tier}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1',
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
