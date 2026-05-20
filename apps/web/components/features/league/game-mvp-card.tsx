import { Badge } from '@/components/ui/badge';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { PlayerLink } from '@/components/ui/player-link';

interface PlayerStat {
  id: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  damage: number;
  side: string;
  result: 'WIN' | 'LOSS';
  player: {
    id: string;
    displayName: string;
    role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  };
}

export interface GameMvpCardProps {
  playerStats: PlayerStat[];
}

function computeScore(s: PlayerStat): number {
  const kda = (s.kills + s.assists) / Math.max(s.deaths, 1);
  const winBonus = s.result === 'WIN' ? 1.15 : 1;
  return kda * winBonus;
}

export function GameMvpCard({ playerStats }: GameMvpCardProps) {
  if (playerStats.length === 0) return null;

  const sorted = [...playerStats].sort((a, b) => computeScore(b) - computeScore(a));
  const mvp = sorted[0];
  if (!mvp) return null;

  const kda = (mvp.kills + mvp.assists) / Math.max(mvp.deaths, 1);

  return (
    <aside className="flex items-center gap-5 border border-hairline border-l-2 border-l-accent bg-background px-5 py-4">
      <ChampionIcon championId={mvp.champion} size="lg" />
      <div className="flex flex-col gap-1">
        <p className="label-mono text-foreground-muted">§ MVP de la game</p>
        <div className="flex items-center gap-2">
          <PlayerLink
            playerId={mvp.player.id}
            className="font-display text-xl text-foreground"
          >
            {mvp.player.displayName}
          </PlayerLink>
          <Badge variant={mvp.player.role}>{mvp.player.role}</Badge>
        </div>
        <p className="text-sm text-foreground-dim tabular-nums">
          {mvp.champion} · {mvp.kills}/{mvp.deaths}/{mvp.assists} ({kda.toFixed(2)} KDA)
        </p>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1">
        <p className="font-display text-2xl text-accent tabular-nums">
          {mvp.damage.toLocaleString('fr-FR')}
        </p>
        <p className="label-mono text-foreground-muted">§ Dégâts</p>
      </div>
    </aside>
  );
}
