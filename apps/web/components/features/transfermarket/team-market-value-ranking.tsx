'use client';

import type { TeamMarketValueEntry } from '@nexus/types';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useTeamTint } from '@/components/ui/team-tint';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface TeamMarketValueRankingProps {
  teams: TeamMarketValueEntry[];
}

interface TeamRowProps {
  team: TeamMarketValueEntry;
  rank: number;
}

function TeamRow({ team, rank }: TeamRowProps) {
  const { dominantColor } = useTeamTint(team.logoUrl);
  const isLeader = rank === 1;

  const monogramStyle: CSSProperties = {
    backgroundColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.18)`,
    color: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
    borderColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.4)`,
  };

  return (
    <Link
      href={`/league/teams/${team.slug}`}
      className={cn(
        'group block border-t border-hairline transition-colors duration-150 hover:bg-surface-hover',
        isLeader && 'border-l-2 border-l-accent',
      )}
    >
      <div className="grid items-center gap-4 px-5 py-5 md:grid-cols-[3rem_3rem_1fr_auto_auto_auto] md:gap-6">
        <span
          className={cn(
            'font-display text-3xl leading-none tabular-nums md:text-4xl',
            isLeader ? 'text-accent' : 'text-foreground-muted',
          )}
        >
          {rank.toString().padStart(2, '0')}
        </span>

        <span
          className="hidden h-11 w-11 items-center justify-center border text-xs font-mono font-medium tracking-[0.08em] uppercase md:inline-flex"
          style={monogramStyle}
          aria-hidden="true"
        >
          {team.shortCode.slice(0, 3)}
        </span>

        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-display tracking-tight text-foreground',
              isLeader ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
            )}
          >
            {team.name}
          </p>
          <p className="mt-1 label-mono">
            {team.shortCode} · {team.playerCount} joueur{team.playerCount > 1 ? 's' : ''}
          </p>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-sm tabular-nums text-foreground-dim">
            {formatCurrency(team.averageMarketValue)}
          </p>
          <p className="mt-1 label-mono">Moy.</p>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-sm tabular-nums text-foreground-dim">
            {formatCurrency(team.totalSalary)}
          </p>
          <p className="mt-1 label-mono">Payroll</p>
        </div>

        <div className="text-right">
          <p
            className={cn(
              'font-display tabular-nums tracking-tight',
              isLeader ? 'text-3xl text-accent md:text-4xl' : 'text-2xl text-foreground md:text-3xl',
            )}
          >
            {formatCurrency(team.totalMarketValue)}
          </p>
          <p className="mt-1 label-mono">Valeur totale</p>
        </div>
      </div>
    </Link>
  );
}

export function TeamMarketValueRanking({ teams }: TeamMarketValueRankingProps) {
  return (
    <div className="border-b border-hairline">
      {teams.map((team, index) => (
        <TeamRow key={team.id} team={team} rank={index + 1} />
      ))}
    </div>
  );
}
