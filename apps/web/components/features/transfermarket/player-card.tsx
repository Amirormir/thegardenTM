import type { PlayerListItem } from '@nexus/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerLink } from '@/components/ui/player-link';
import { PlayerValue } from '@/components/ui/player-value';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';

export interface PlayerCardProps {
  player: PlayerListItem;
}

function resolveTier(value: number): 'S' | 'A' | 'B' | 'C' {
  if (value >= 950000) {
    return 'S';
  }
  if (value >= 850000) {
    return 'A';
  }
  if (value >= 750000) {
    return 'B';
  }
  return 'C';
}

export function PlayerCard({ player }: PlayerCardProps) {
  const tier = resolveTier(player.marketValue);
  const riotId = buildPlayerRiotId(player);

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.displayName}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-white/[0.06]"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-base font-semibold text-white/80 ring-1 ring-white/[0.06]">
              {getPlayerInitials(player.displayName)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={player.role}>{player.role}</Badge>
              {player.secondaryRoles?.map((secondaryRole) => (
                <Badge key={secondaryRole} variant={secondaryRole}>
                  {secondaryRole}
                </Badge>
              ))}
              <Badge variant={tier}>{tier}</Badge>
            </div>
            <div className="mt-3 min-w-0">
              <PlayerLink
                playerId={player.id}
                className="block truncate font-display text-xl font-bold tracking-tight text-white"
              >
                {player.displayName}
              </PlayerLink>
              <p className="mt-1 truncate text-sm text-text-secondary" title={riotId}>
                {riotId}
              </p>
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-text-secondary">
              <TeamAvatar
                name={player.teamName}
                shortCode={player.teamShortCode ?? 'FA'}
                logoUrl={player.teamLogoUrl ?? null}
                size="sm"
                className="h-5 w-5 rounded-full text-[0.5rem]"
              />
              <span className="truncate" title={player.teamName}>
                {player.teamName}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.06em] text-text-secondary">
          Salary {player.salary.toLocaleString('fr-FR')}
        </div>
      </div>

      <div className="mt-5">
        <PlayerValue
          value={player.marketValue}
          delta={player.marketValueDelta ?? 0}
          size="sm"
          tone="neutral"
        />
      </div>

      <Link
        href={`/transfermarket/${player.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-glow transition hover:text-white"
      >
        Voir la fiche
        <ArrowRight className="h-4 w-4" />
      </Link>

      <Link
        href={`/transfermarket/comparison?playerA=${player.id}`}
        className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-white"
      >
        Comparer ce profil
      </Link>
    </Card>
  );
}
