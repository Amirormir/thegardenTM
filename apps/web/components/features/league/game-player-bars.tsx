'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { PlayerLink } from '@/components/ui/player-link';
import { cn } from '@/lib/utils/cn';

interface PlayerStat {
  id: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  damage: number;
  side: string;
  result: 'WIN' | 'LOSS';
  player: {
    id: string;
    displayName: string;
    role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  };
}

export interface GamePlayerBarsProps {
  playerStats: PlayerStat[];
  metric: 'damage' | 'gold';
  title: string;
  helper: string;
}

const ROLE_ORDER: Record<string, number> = {
  TOP: 0,
  JUNGLE: 1,
  MID: 2,
  ADC: 3,
  SUPPORT: 4,
};

function PlayerBar({
  stat,
  value,
  pctOfMax,
}: {
  stat: PlayerStat;
  value: number;
  pctOfMax: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const won = stat.result === 'WIN';

  return (
    <li className="grid grid-cols-[auto_8rem_minmax(0,1fr)_5rem] items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
      <ChampionIcon championId={stat.champion} size="sm" />
      <PlayerLink
        playerId={stat.player.id}
        className={cn(
          'truncate font-display',
          won ? 'text-foreground' : 'text-foreground-dim',
        )}
      >
        {stat.player.displayName}
      </PlayerLink>
      <div className="flex h-1.5 overflow-hidden bg-hairline">
        <motion.div
          className={cn('h-full', won ? 'bg-accent' : 'bg-foreground-dim/60')}
          initial={prefersReducedMotion ? { width: `${pctOfMax}%` } : { width: 0 }}
          animate={{ width: `${pctOfMax}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-right font-display tabular-nums text-foreground">
        {value.toLocaleString('fr-FR')}
      </span>
    </li>
  );
}

export function GamePlayerBars({ playerStats, metric, title, helper }: GamePlayerBarsProps) {
  if (playerStats.length === 0) return null;

  const sorted = [...playerStats].sort((a, b) => {
    if (a.side !== b.side) return a.side === 'BLUE' ? -1 : 1;
    return (ROLE_ORDER[a.player.role] ?? 9) - (ROLE_ORDER[b.player.role] ?? 9);
  });

  const max = Math.max(...sorted.map((s) => s[metric]), 1);

  const blueStats = sorted.filter((s) => s.side === 'BLUE');
  const redStats = sorted.filter((s) => s.side === 'RED');

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        <p className="label-mono text-foreground-muted">§ {helper}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col">
          {blueStats.map((s) => (
            <PlayerBar
              key={s.id}
              stat={s}
              value={s[metric]}
              pctOfMax={(s[metric] / max) * 100}
            />
          ))}
        </ul>
        <ul className="flex flex-col">
          {redStats.map((s) => (
            <PlayerBar
              key={s.id}
              stat={s}
              value={s[metric]}
              pctOfMax={(s[metric] / max) * 100}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
