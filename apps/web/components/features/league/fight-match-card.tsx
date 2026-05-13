'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useTeamTint } from '@/components/ui/team-tint';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate } from '@/lib/utils/format';

export interface FightMatchCardProps {
  match: {
    id: string;
    format: string;
    scheduledAt: string | Date;
    playedAt?: string | Date | null;
    homeScore: number;
    awayScore: number;
    isCompleted: boolean;
    homeTeam: { name: string; shortCode: string; logoUrl?: string | null };
    awayTeam: { name: string; shortCode: string; logoUrl?: string | null };
  };
  index?: number;
}

interface SideProps {
  team: { name: string; shortCode: string; logoUrl?: string | null };
  score: number;
  isWinner: boolean;
  isCompleted: boolean;
  align: 'left' | 'right';
}

function MatchSide({ team, score, isWinner, isCompleted, align }: SideProps) {
  const { dominantColor } = useTeamTint(team.logoUrl);

  const monogramStyle: CSSProperties = {
    backgroundColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.18)`,
    color: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
    borderColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.4)`,
  };

  const dim = isCompleted && !isWinner;

  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-4 px-5 py-6 md:px-7 md:py-8',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center border text-[0.6875rem] font-mono font-medium tracking-[0.08em] uppercase md:h-12 md:w-12"
        style={monogramStyle}
        aria-hidden="true"
      >
        {team.shortCode.slice(0, 3)}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate font-display text-xl tracking-tight md:text-2xl',
            dim ? 'text-foreground-muted' : 'text-foreground',
          )}
        >
          {team.name}
        </p>
        <p className="mt-1 label-mono">{team.shortCode}</p>
      </div>

      <p
        className={cn(
          'font-display tabular-nums leading-none',
          'text-5xl md:text-6xl',
          dim ? 'text-foreground-muted' : 'text-foreground',
          isWinner && 'text-accent',
        )}
      >
        {score}
      </p>
    </div>
  );
}

export function FightMatchCard({ match }: FightMatchCardProps) {
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    if (!match.isCompleted) {
      setIsLive(new Date(match.scheduledAt).getTime() <= Date.now());
    }
  }, [match.isCompleted, match.scheduledAt]);

  const homeWins = match.isCompleted && match.homeScore > match.awayScore;
  const awayWins = match.isCompleted && match.awayScore > match.homeScore;
  const displayDate = match.playedAt ?? match.scheduledAt;

  return (
    <Link
      href={`/league/matches/${match.id}`}
      className="group block border-t border-hairline transition-colors duration-150 hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-2 label-mono">
        <span>{match.format}</span>
        <span>{formatCompactDate(displayDate)}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <MatchSide
          team={match.homeTeam}
          score={match.homeScore}
          isWinner={homeWins}
          isCompleted={match.isCompleted}
          align="left"
        />
        <div className="flex items-center justify-center px-2">
          <span className="h-full w-px bg-hairline" />
        </div>
        <MatchSide
          team={match.awayTeam}
          score={match.awayScore}
          isWinner={awayWins}
          isCompleted={match.isCompleted}
          align="right"
        />
      </div>

      <div className="border-t border-hairline px-5 py-2 text-center label-mono">
        {isLive ? (
          <span className="inline-flex items-center gap-2 text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            En direct
          </span>
        ) : match.isCompleted ? (
          <span>Final</span>
        ) : (
          <span>Programmé</span>
        )}
      </div>
    </Link>
  );
}
