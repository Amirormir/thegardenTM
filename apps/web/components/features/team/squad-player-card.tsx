import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getPlayerInitials } from '@/lib/utils/player-display';

interface SquadPlayerCardProps {
  player: {
    id: string;
    displayName: string;
    imageUrl: string | null;
    role: string;
    teamRole: string | null;
  };
  stats: {
    games: number;
    wins: number;
    avgKda: number;
    avgCs: number;
    topChampion: string | null;
  } | null;
}

export function SquadPlayerCard({ player, stats }: SquadPlayerCardProps) {
  const winRate = stats && stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : null;

  return (
    <Link
      href={`/transfermarket/${player.id}`}
      className="group flex flex-col gap-3 transition-opacity hover:opacity-90"
    >
      <div className="placeholder-diag relative aspect-[4/5] w-full overflow-hidden">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.displayName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl text-foreground-dim">
            {getPlayerInitials(player.displayName)}
          </div>
        )}
        <span className="absolute left-2 top-2 border border-hairline bg-background/85 px-2 py-0.5 label-mono backdrop-blur-sm">
          <Badge variant={(player.teamRole ?? player.role) as never} className="!border-0 !p-0">
            {player.teamRole ?? player.role}
          </Badge>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="display-md text-lg leading-tight text-foreground">{player.displayName}</p>
        {stats && stats.games > 0 ? (
          <dl className="grid grid-cols-3 gap-2 border-t border-hairline pt-2 text-xs">
            <div>
              <dt className="label-mono text-foreground-muted">KDA</dt>
              <dd className="mt-0.5 font-display tabular-nums text-foreground">
                {stats.avgKda.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">WR</dt>
              <dd
                className="mt-0.5 font-display tabular-nums"
                style={{ color: winRate !== null && winRate >= 50 ? 'var(--win)' : 'var(--foreground)' }}
              >
                {winRate}%
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Games</dt>
              <dd className="mt-0.5 font-display tabular-nums text-foreground">{stats.games}</dd>
            </div>
            {stats.topChampion ? (
              <div className="col-span-3">
                <dt className="label-mono text-foreground-muted">Champion phare</dt>
                <dd className="mt-0.5 label-mono text-foreground">{stats.topChampion}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="border-t border-hairline pt-2 label-mono text-foreground-muted">
            Pas de stats récentes
          </p>
        )}
      </div>
    </Link>
  );
}
