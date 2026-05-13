import type { PlayerListItem } from '@nexus/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TeamInline } from '@/components/ui/team-inline';
import { getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface TopPlayersShowcaseProps {
  players: PlayerListItem[];
}

export function TopPlayersShowcase({ players }: TopPlayersShowcaseProps) {
  if (players.length < 3) return null;

  const top3 = players.slice(0, 3);

  return (
    <div className="grid gap-px border-t border-hairline bg-hairline md:grid-cols-3">
      {top3.map((player, index) => {
        const isLeader = index === 0;
        const delta = player.marketValueDelta ?? 0;
        const positive = delta >= 0;

        return (
          <Link
            key={player.id}
            href={`/transfermarket/${player.id}`}
            className={cn(
              'group flex flex-col bg-background px-6 py-7 transition-colors duration-150 hover:bg-surface-hover',
              isLeader && 'border-l-2 border-l-accent',
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'font-display text-3xl leading-none tabular-nums',
                  isLeader ? 'text-accent' : 'text-foreground-muted',
                )}
              >
                § {(index + 1).toString().padStart(2, '0')}
              </span>
              <Badge variant={player.role}>{player.role}</Badge>
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="placeholder-diag h-20 w-20 shrink-0 overflow-hidden">
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-xl text-foreground-dim">
                    {getPlayerInitials(player.displayName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={cn(
                    'truncate font-display tracking-tight text-foreground',
                    isLeader ? 'text-3xl' : 'text-2xl',
                  )}
                >
                  {player.displayName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 label-mono text-foreground-dim">
                  <TeamInline
                    name={player.teamName}
                    shortCode={player.teamShortCode ?? 'FA'}
                    logoUrl={player.teamLogoUrl}
                    size="xs"
                    text={player.teamShortCode ?? 'FA'}
                    textClassName="text-foreground-dim"
                  />
                  <span>·</span>
                  <span>{player.role}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <p className="label-mono">Valeur marchande</p>
              <p
                className={cn(
                  'mt-2 font-display tracking-tight tabular-nums',
                  isLeader ? 'text-5xl text-accent' : 'text-4xl text-foreground',
                )}
              >
                {formatCurrency(player.marketValue)}
              </p>
              <p
                className={cn(
                  'mt-2 label-mono tabular-nums',
                  positive ? 'text-[color:var(--win)]' : 'text-[color:var(--loss)]',
                )}
              >
                {positive ? '+' : ''}
                {formatCurrency(delta)} · Salaire {formatCurrency(player.salary)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
