import type { PlayerListItem } from '@nexus/types';
import { Crown, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PlayerValue } from '@/components/ui/player-value';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { TeamTintCard, TeamTintMediaFrame } from '@/components/ui/team-tint';
import { getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';

interface TopPlayersShowcaseProps {
  players: PlayerListItem[];
}

const PODIUM_CONFIG = [
  {
    rank: 1,
    icon: Crown,
    label: '#1',
    photoSize: 'h-28 w-28',
    textSize: 'text-2xl',
    initSize: 'text-xl',
  },
  {
    rank: 2,
    icon: Medal,
    label: '#2',
    photoSize: 'h-24 w-24',
    textSize: 'text-xl',
    initSize: 'text-lg',
  },
  {
    rank: 3,
    icon: Trophy,
    label: '#3',
    photoSize: 'h-24 w-24',
    textSize: 'text-xl',
    initSize: 'text-lg',
  },
] as const;

export function TopPlayersShowcase({ players }: TopPlayersShowcaseProps) {
  if (players.length < 3) return null;

  const top3 = players.slice(0, 3);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {top3.map((player, index) => {
        const config = PODIUM_CONFIG[index]!;
        const Icon = config.icon;

        return (
          <Link key={player.id} href={`/transfermarket/${player.id}`} className="group">
            <TeamTintCard
              elevated
              className="relative h-full transition-all duration-300 group-hover:scale-[1.01]"
              contentClassName="space-y-5"
              logoUrl={player.teamLogoUrl}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <Icon className="h-4 w-4" />
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.06em]">
                    {config.label} Market Value
                  </span>
                </div>
                <Badge variant={player.role}>{player.role}</Badge>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <TeamTintMediaFrame
                  logoUrl={player.teamLogoUrl}
                  className={`${config.photoSize} rounded-full`}
                >
                  {player.imageUrl ? (
                    <img
                      src={player.imageUrl}
                      alt={player.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-600/10 font-display ${config.initSize} font-bold text-white/80`}
                    >
                      {getPlayerInitials(player.displayName)}
                    </div>
                  )}
                </TeamTintMediaFrame>

                <div>
                  <h3 className={`font-display ${config.textSize} font-bold tracking-tight text-white`}>
                    {player.displayName}
                  </h3>
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-text-muted">
                    <TeamAvatar
                      name={player.teamName}
                      shortCode={player.teamShortCode ?? 'FA'}
                      logoUrl={player.teamLogoUrl ?? null}
                      size="sm"
                      className="h-5 w-5 rounded-full text-[0.5rem]"
                    />
                    <span>
                      {player.teamName} {player.teamShortCode ? `(${player.teamShortCode})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <PlayerValue
                  value={player.marketValue}
                  delta={player.marketValueDelta ?? 0}
                  size="sm"
                  tone="neutral"
                />
              </div>

              <div className="flex items-center justify-center gap-3 text-xs text-text-secondary">
                <span>
                  Salaire <span className="font-display font-bold tracking-tight text-white tabular-nums">{formatCurrency(player.salary)}</span>
                </span>
              </div>
            </TeamTintCard>
          </Link>
        );
      })}
    </section>
  );
}
