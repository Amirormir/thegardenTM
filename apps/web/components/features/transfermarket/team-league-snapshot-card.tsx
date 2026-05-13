'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useTeamTint } from '@/components/ui/team-tint';

interface TeamLeagueSnapshotCardProps {
  team: {
    name: string;
    slug: string;
    shortCode: string;
    logoUrl: string | null;
  };
  place: number;
  points: number;
  wins: number;
  losses: number;
  mapWins: number;
  mapLosses: number;
}

export function TeamLeagueSnapshotCard({
  team,
  place,
  points,
  wins,
  losses,
  mapWins,
  mapLosses,
}: TeamLeagueSnapshotCardProps) {
  const { dominantColor } = useTeamTint(team.logoUrl);

  const borderStyle: CSSProperties = {
    borderLeftColor: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
  };

  const monogramStyle: CSSProperties = {
    backgroundColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.18)`,
    color: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
    borderColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.4)`,
  };

  return (
    <Link
      href={`/league/teams/${team.slug}`}
      className="group block border border-l-2 border-hairline bg-surface transition-colors duration-150 hover:bg-surface-hover"
      style={borderStyle}
    >
      <div className="border-b border-hairline px-5 py-3 label-mono">League snapshot</div>

      <div className="px-5 py-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center border text-xs font-mono font-medium tracking-[0.08em] uppercase"
              style={monogramStyle}
              aria-hidden="true"
            >
              {team.shortCode.slice(0, 3)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl text-foreground">{team.name}</p>
              <p className="mt-1 label-mono">{team.shortCode}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="label-mono">Place</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-foreground">
              {place.toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        <div className="border-t border-hairline pt-4 flex items-end justify-between gap-4">
          <div>
            <p className="label-mono">Points ligue</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-foreground">
              {points}
              <span className="ml-2 text-sm text-foreground-dim">pts</span>
            </p>
          </div>

          <p className="text-right label-mono tabular-nums leading-5">
            {wins}W · {losses}L
            <br />
            {mapWins}–{mapLosses} maps
          </p>
        </div>
      </div>
    </Link>
  );
}
