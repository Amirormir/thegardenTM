import { Clock3 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
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
    };
    awayTeam: {
      name: string;
      shortCode: string;
    };
  };
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-kicker">{match.format}</div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-secondary">
          <Clock3 className="h-4 w-4" />
          {formatDateTime(match.scheduledAt)}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-left">
          <p className="text-lg font-semibold text-white">{match.homeTeam.name}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {match.homeTeam.shortCode}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-center">
          <div className="font-display text-3xl font-bold text-white">
            {match.homeScore} - {match.awayScore}
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
            {match.isCompleted ? 'Final' : 'Scheduled'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-white">{match.awayTeam.name}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {match.awayTeam.shortCode}
          </p>
        </div>
      </div>
      <Link
        href={`/league/matches/${match.id}`}
        className="text-sm font-semibold text-accent-glow transition hover:text-white"
      >
        Ouvrir le détail
      </Link>
    </Card>
  );
}
