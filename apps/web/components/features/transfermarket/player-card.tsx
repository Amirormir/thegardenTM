import type { PlayerListItem } from '@nexus/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';

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

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.gameName}
              className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-lg font-semibold text-white ring-1 ring-white/10">
              {player.gameName.slice(0, 2).toUpperCase()}
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
            <h3 className="mt-4 font-display text-2xl font-bold text-white">
              {player.gameName}
              <span className="ml-1 text-base font-medium text-text-secondary">
                #{player.tagLine}
              </span>
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {player.firstName} {player.lastName} / {player.teamName}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-text-secondary">
          Salary {player.salary.toLocaleString('fr-FR')}
        </div>
      </div>

      <div className="mt-6">
        <PlayerValue value={player.marketValue} delta={player.marketValueDelta ?? 0} size="sm" />
      </div>

      <Link
        href={`/transfermarket/${player.id}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-glow transition hover:text-white"
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
