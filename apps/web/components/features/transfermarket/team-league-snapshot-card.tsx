'use client';

import Link from 'next/link';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { Card } from '@/components/ui/card';
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

function toRgba(r: number, g: number, b: number, alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  const cardStyle = {
    background: `linear-gradient(145deg, ${toRgba(dominantColor.r, dominantColor.g, dominantColor.b, 0.34)} 0%, rgba(17, 17, 26, 0.9) 62%, rgba(255, 255, 255, 0.06) 100%)`,
    boxShadow: `0 0 34px ${toRgba(dominantColor.r, dominantColor.g, dominantColor.b, 0.16)}`,
  };

  const glowStyle = {
    background: `radial-gradient(circle at top right, ${toRgba(dominantColor.r, dominantColor.g, dominantColor.b, 0.46)} 0%, transparent 40%)`,
  };

  return (
    <Card className="relative overflow-hidden border-white/10" style={cardStyle}>
      <div className="pointer-events-none absolute inset-0 opacity-90" style={glowStyle} />
      <div className="relative space-y-4">
        <p className="text-kicker text-white/72">League snapshot</p>

        <Link
          href={`/league/teams/${team.slug}`}
          className="block rounded-[24px] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <TeamAvatar
                name={team.name}
                shortCode={team.shortCode}
                logoUrl={team.logoUrl}
                size="md"
                className="h-12 w-12 rounded-2xl border border-white/10 bg-white/8"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{team.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/64">
                  {team.shortCode}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-right">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">Place</p>
              <p className="font-display text-2xl font-bold text-white">#{place}</p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">
                Score ligue
              </p>
              <p className="font-display text-3xl font-bold text-white">
                {points}
                <span className="ml-2 text-base font-semibold text-white/72">pts</span>
              </p>
            </div>

            <p className="text-right text-xs uppercase tracking-[0.18em] text-white/62">
              {wins}W - {losses}L
              <br />
              {mapWins}-{mapLosses} maps
            </p>
          </div>
        </Link>
      </div>
    </Card>
  );
}
