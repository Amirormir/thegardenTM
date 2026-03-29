import type { PlayerListItem } from '@nexus/types';
import { Crown, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';
import { formatCurrency } from '@/lib/utils/format';

interface TopPlayersShowcaseProps {
  players: PlayerListItem[];
}

const PODIUM_CONFIG = [
  {
    rank: 1,
    icon: Crown,
    border: 'border-amber-400/30',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.15)]',
    ring: 'ring-amber-400/40',
    iconColor: 'text-amber-400',
    label: '#1',
    photoSize: 'h-32 w-32',
    textSize: 'text-4xl',
    initSize: 'text-3xl',
  },
  {
    rank: 2,
    icon: Medal,
    border: 'border-slate-300/20',
    glow: 'shadow-[0_0_40px_rgba(148,163,184,0.1)]',
    ring: 'ring-slate-300/30',
    iconColor: 'text-slate-300',
    label: '#2',
    photoSize: 'h-28 w-28',
    textSize: 'text-3xl',
    initSize: 'text-2xl',
  },
  {
    rank: 3,
    icon: Trophy,
    border: 'border-orange-400/20',
    glow: 'shadow-[0_0_40px_rgba(251,146,60,0.1)]',
    ring: 'ring-orange-400/30',
    iconColor: 'text-orange-400',
    label: '#3',
    photoSize: 'h-28 w-28',
    textSize: 'text-3xl',
    initSize: 'text-2xl',
  },
] as const;

export function TopPlayersShowcase({ players }: TopPlayersShowcaseProps) {
  if (players.length < 3) return null;

  const top3 = players.slice(0, 3);

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {top3.map((player, index) => {
        const config = PODIUM_CONFIG[index]!;
        const Icon = config.icon;

        return (
          <Link key={player.id} href={`/transfermarket/${player.id}`} className="group">
            <Card
              elevated
              className={`relative h-full space-y-5 transition-all duration-300 ${config.border} ${config.glow} group-hover:scale-[1.02] group-hover:border-accent-primary/30`}
            >
              {/* Rank badge */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${config.iconColor}`}>
                  <Icon className="h-5 w-5" />
                  <span className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                    {config.label} Market Value
                  </span>
                </div>
                <Badge variant={player.role}>{player.role}</Badge>
              </div>

              {/* Player photo + info */}
              <div className="flex flex-col items-center gap-4 text-center">
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.gameName}
                    className={`${config.photoSize} rounded-[28px] object-cover ring-2 ${config.ring} transition-shadow duration-300 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]`}
                  />
                ) : (
                  <div
                    className={`flex ${config.photoSize} items-center justify-center rounded-[28px] bg-white/8 font-display ${config.initSize} font-bold text-white ring-2 ${config.ring}`}
                  >
                    {player.gameName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className={`font-display ${config.textSize} font-bold text-white`}>
                    {player.gameName}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {player.teamName} {player.teamShortCode ? `(${player.teamShortCode})` : ''}
                  </p>
                </div>
              </div>

              {/* Value */}
              <div className="flex justify-center">
                <PlayerValue
                  value={player.marketValue}
                  delta={player.marketValueDelta ?? 0}
                  size="sm"
                />
              </div>

              {/* Salary */}
              <div className="flex items-center justify-center gap-3 text-xs text-text-secondary">
                <span>
                  Salaire <span className="font-mono text-white">{formatCurrency(player.salary)}</span>
                </span>
              </div>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}
