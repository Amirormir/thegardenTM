import Link from 'next/link';
import { TeamAvatar } from '@/components/ui/team-avatar';

interface MatchEntry {
  id: string;
  format: string;
  scheduledAt: Date;
  playedAt: Date | null;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  homeTeam: { id: string; name: string; shortCode: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; shortCode: string; logoUrl: string | null };
}

interface SquadRecentMatchesProps {
  matches: MatchEntry[];
  teamId: string;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

export function SquadRecentMatches({ matches, teamId }: SquadRecentMatchesProps) {
  if (matches.length === 0) {
    return (
      <p className="label-mono text-foreground-muted">
        Aucun match récent. Les derniers résultats apparaîtront ici.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
      {matches.map((match) => {
        const isHome = match.homeTeam.id === teamId;
        const opponent = isHome ? match.awayTeam : match.homeTeam;
        const won = match.winnerTeamId === teamId;
        const drew = match.winnerTeamId === null;
        const ours = isHome ? match.homeScore : match.awayScore;
        const theirs = isHome ? match.awayScore : match.homeScore;
        const dateLabel = dateFormatter.format(match.playedAt ?? match.scheduledAt);
        const resultLabel = drew ? 'D' : won ? 'W' : 'L';
        const resultColor = drew
          ? 'var(--foreground-muted)'
          : won
            ? 'var(--win)'
            : 'var(--loss)';

        return (
          <li key={match.id}>
            <Link
              href={`/league/matches/${match.id}`}
              className="flex items-center gap-4 py-3 transition-colors hover:bg-surface"
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center border border-hairline font-display text-sm tabular-nums"
                style={{ color: resultColor }}
              >
                {resultLabel}
              </span>
              <span className="label-mono text-foreground-muted">{dateLabel}</span>
              <TeamAvatar
                name={opponent.name}
                shortCode={opponent.shortCode}
                logoUrl={opponent.logoUrl}
                size="sm"
              />
              <span className="flex-1 truncate text-sm text-foreground">{opponent.name}</span>
              <span className="font-display tabular-nums text-sm text-foreground">
                {ours} – {theirs}
              </span>
              <span className="label-mono text-foreground-muted">{match.format}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
