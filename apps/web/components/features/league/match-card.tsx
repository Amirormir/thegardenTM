import { Clock3 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { formatDateTime } from '@/lib/utils/format';

export interface MatchCardProps {
  match: {
    id: string;
    format: string;
    scheduledAt: string | Date;
    homeScore: number;
    awayScore: number;
    isCompleted: boolean;
    homeTeam: {
      name: string;
      shortCode: string;
      logoUrl?: string | null;
    };
    awayTeam: {
      name: string;
      shortCode: string;
      logoUrl?: string | null;
    };
  };
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="label-mono">{match.format}</div>
        <div className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.06em] text-foreground-dim">
          <Clock3 className="h-3.5 w-3.5" />
          {formatDateTime(match.scheduledAt)}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          <TeamAvatar
            name={match.homeTeam.name}
            shortCode={match.homeTeam.shortCode}
            logoUrl={match.homeTeam.logoUrl ?? null}
            size="md"
          />
          <div>
            <p className="text-base font-semibold text-white">{match.homeTeam.name}</p>
            <p className="text-[0.65rem] uppercase tracking-[0.06em] text-foreground-dim">
              {match.homeTeam.shortCode}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-5 py-3.5 text-center">
          <div className="font-display text-2xl font-bold tracking-tight text-white tabular-nums">
            {match.homeScore} - {match.awayScore}
          </div>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.06em] text-foreground-dim">
            {match.isCompleted ? 'Final' : 'Scheduled'}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <p className="text-base font-semibold text-white">{match.awayTeam.name}</p>
            <p className="text-[0.65rem] uppercase tracking-[0.06em] text-foreground-dim">
              {match.awayTeam.shortCode}
            </p>
          </div>
          <TeamAvatar
            name={match.awayTeam.name}
            shortCode={match.awayTeam.shortCode}
            logoUrl={match.awayTeam.logoUrl ?? null}
            size="md"
          />
        </div>
      </div>
      <Link
        href={`/league/matches/${match.id}`}
        className="text-sm font-semibold text-accent transition hover:text-white"
      >
        Ouvrir le detail
      </Link>
    </Card>
  );
}
