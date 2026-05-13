import type { PlayerListItem } from '@nexus/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PlayerLink } from '@/components/ui/player-link';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface PlayerCardProps {
  player: PlayerListItem;
}

function resolveTier(value: number): 'S' | 'A' | 'B' | 'C' {
  if (value >= 950000) return 'S';
  if (value >= 850000) return 'A';
  if (value >= 750000) return 'B';
  return 'C';
}

export function PlayerCard({ player }: PlayerCardProps) {
  const tier = resolveTier(player.marketValue);
  const riotId = buildPlayerRiotId(player);
  const delta = player.marketValueDelta ?? 0;
  const positive = delta >= 0;

  return (
    <article className="flex h-full flex-col bg-background px-5 py-5 transition-colors duration-150 hover:bg-surface-hover md:px-6">
      <div className="flex items-center gap-2">
        <Badge variant={player.role}>{player.role}</Badge>
        {player.secondaryRoles?.map((secondaryRole) => (
          <Badge key={secondaryRole} variant={secondaryRole}>
            {secondaryRole}
          </Badge>
        ))}
        <span className="ml-auto label-mono">Tier {tier}</span>
      </div>

      <div className="mt-5 flex items-start gap-4">
        <div className="placeholder-diag h-16 w-16 shrink-0 overflow-hidden">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-base text-foreground-dim">
              {getPlayerInitials(player.displayName)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <PlayerLink
            playerId={player.id}
            className="block truncate font-display text-2xl tracking-tight text-foreground"
          >
            {player.displayName}
          </PlayerLink>
          <p className="mt-1 truncate label-mono" title={riotId}>
            {riotId}
          </p>
          <p className="mt-2 truncate text-sm text-foreground-dim" title={player.teamName}>
            {player.teamName}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-hairline pt-4">
        <div>
          <p className="label-mono">Valeur marchande</p>
          <p className="mt-1 font-display text-2xl tabular-nums tracking-tight text-foreground">
            {formatCurrency(player.marketValue)}
          </p>
          <p
            className={cn(
              'mt-1 label-mono tabular-nums',
              positive ? 'text-[color:var(--win)]' : 'text-[color:var(--loss)]',
            )}
          >
            {positive ? '+' : ''}
            {formatCurrency(delta)}
          </p>
        </div>
        <div>
          <p className="label-mono">Salaire</p>
          <p className="mt-1 font-display text-2xl tabular-nums tracking-tight text-foreground">
            {formatCurrency(player.salary)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5 border-t border-hairline pt-4 label-mono">
        <Link
          href={`/transfermarket/${player.id}`}
          className="text-foreground-dim transition-colors duration-150 hover:text-accent"
        >
          Voir la fiche →
        </Link>
        <Link
          href={`/transfermarket/comparison?playerA=${player.id}`}
          className="text-foreground-muted transition-colors duration-150 hover:text-accent"
        >
          Comparer
        </Link>
      </div>
    </article>
  );
}
