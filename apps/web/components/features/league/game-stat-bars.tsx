'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface PlayerStat {
  id: string;
  side: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  visionScore: number;
}

export interface GameStatBarsProps {
  playerStats: PlayerStat[];
  blueTeamShortCode: string;
  redTeamShortCode: string;
  winningSide: 'BLUE' | 'RED' | null;
}

interface SideTotals {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  visionScore: number;
}

const EMPTY_TOTALS: SideTotals = {
  kills: 0,
  deaths: 0,
  assists: 0,
  cs: 0,
  gold: 0,
  damage: 0,
  visionScore: 0,
};

function sumSide(stats: PlayerStat[], side: 'BLUE' | 'RED'): SideTotals {
  return stats
    .filter((s) => s.side === side)
    .reduce<SideTotals>(
      (acc, s) => ({
        kills: acc.kills + s.kills,
        deaths: acc.deaths + s.deaths,
        assists: acc.assists + s.assists,
        cs: acc.cs + s.cs,
        gold: acc.gold + s.gold,
        damage: acc.damage + s.damage,
        visionScore: acc.visionScore + s.visionScore,
      }),
      EMPTY_TOTALS,
    );
}

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

function formatGold(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

interface RowProps {
  label: string;
  blueValue: number;
  redValue: number;
  formatter: (n: number) => string;
  blueWon: boolean;
  redWon: boolean;
}

function Row({ label, blueValue, redValue, formatter, blueWon, redWon }: RowProps) {
  const prefersReducedMotion = useReducedMotion();
  const total = blueValue + redValue;
  const bluePct = total > 0 ? (blueValue / total) * 100 : 50;
  const redPct = total > 0 ? (redValue / total) * 100 : 50;

  const blueLead = blueValue > redValue;
  const redLead = redValue > blueValue;

  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)_7rem] items-center gap-4 py-2">
      <span
        className={cn(
          'text-right font-display tabular-nums',
          blueLead ? 'text-foreground' : 'text-foreground-dim',
        )}
      >
        {formatter(blueValue)}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-center label-mono text-foreground-muted">§ {label}</p>
        <div className="flex h-2 overflow-hidden bg-hairline">
          <motion.div
            className={cn(
              'h-full',
              blueWon ? 'bg-accent' : 'bg-foreground-dim/60',
            )}
            initial={prefersReducedMotion ? { width: `${bluePct}%` } : { width: 0 }}
            animate={{ width: `${bluePct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.div
            className={cn(
              'h-full ml-auto',
              redWon ? 'bg-accent' : 'bg-foreground-dim/60',
            )}
            initial={prefersReducedMotion ? { width: `${redPct}%` } : { width: 0 }}
            animate={{ width: `${redPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
          />
        </div>
      </div>
      <span
        className={cn(
          'text-left font-display tabular-nums',
          redLead ? 'text-foreground' : 'text-foreground-dim',
        )}
      >
        {formatter(redValue)}
      </span>
    </div>
  );
}

export function GameStatBars({
  playerStats,
  blueTeamShortCode,
  redTeamShortCode,
  winningSide,
}: GameStatBarsProps) {
  if (playerStats.length === 0) return null;

  const blue = sumSide(playerStats, 'BLUE');
  const red = sumSide(playerStats, 'RED');
  const blueWon = winningSide === 'BLUE';
  const redWon = winningSide === 'RED';

  const rows: Array<Omit<RowProps, 'blueWon' | 'redWon'>> = [
    { label: 'Kills', blueValue: blue.kills, redValue: red.kills, formatter: formatNumber },
    { label: 'Gold', blueValue: blue.gold, redValue: red.gold, formatter: formatGold },
    { label: 'Damage', blueValue: blue.damage, redValue: red.damage, formatter: formatGold },
    { label: 'CS', blueValue: blue.cs, redValue: red.cs, formatter: formatNumber },
    {
      label: 'Vision',
      blueValue: blue.visionScore,
      redValue: red.visionScore,
      formatter: formatNumber,
    },
  ];

  return (
    <div className="border border-hairline bg-background">
      <header className="grid grid-cols-[7rem_minmax(0,1fr)_7rem] items-baseline gap-4 border-b border-hairline px-4 py-3">
        <p
          className={cn(
            'text-right label-mono',
            blueWon ? 'text-accent' : 'text-foreground-dim',
          )}
        >
          BLUE · {blueTeamShortCode}
        </p>
        <p className="text-center label-mono text-foreground-muted">§ Team totals</p>
        <p
          className={cn(
            'text-left label-mono',
            redWon ? 'text-accent' : 'text-foreground-dim',
          )}
        >
          {redTeamShortCode} · RED
        </p>
      </header>
      <div className="flex flex-col px-4 py-3">
        {rows.map((row) => (
          <Row key={row.label} {...row} blueWon={blueWon} redWon={redWon} />
        ))}
      </div>
    </div>
  );
}
