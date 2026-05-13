'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { PlayerLink } from '@/components/ui/player-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

type PlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
type StatsTab = 'players' | 'teams' | 'champions';
type PlayerSort =
  | 'kda'
  | 'avgKills'
  | 'avgDeaths'
  | 'avgAssists'
  | 'csPerMin'
  | 'avgDamage'
  | 'avgVisionScore'
  | 'winRate'
  | 'games'
  | 'uniqueChampions'
  | 'avgGold';

const ROLES: PlayerRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const PLAYER_SORT_OPTIONS: { value: PlayerSort; label: string }[] = [
  { value: 'kda', label: 'KDA' },
  { value: 'avgKills', label: 'Kills / game' },
  { value: 'avgDeaths', label: 'Deaths / game' },
  { value: 'avgAssists', label: 'Assists / game' },
  { value: 'csPerMin', label: 'CS / min' },
  { value: 'avgDamage', label: 'Damage / game' },
  { value: 'avgVisionScore', label: 'Vision / game' },
  { value: 'avgGold', label: 'Gold / game' },
  { value: 'winRate', label: 'Win rate' },
  { value: 'games', label: 'Games' },
  { value: 'uniqueChampions', label: 'Champions joués' },
];

const TAB_LABELS: Record<StatsTab, string> = {
  players: 'Joueurs',
  teams: 'Équipes',
  champions: 'Champions',
};

function StatsTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative pb-3 text-sm transition-colors duration-150',
        active ? 'text-foreground' : 'text-foreground-dim hover:text-foreground',
      )}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-px bg-accent"
        />
      ) : null}
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border px-3 py-1.5 label-mono transition-colors duration-150',
        active
          ? 'border-accent bg-surface text-foreground'
          : 'border-hairline bg-background text-foreground-dim hover:bg-surface-hover hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

export function LeagueStatsView() {
  const [tab, setTab] = useState<StatsTab>('players');
  const [role, setRole] = useState<PlayerRole | undefined>(undefined);
  const [playerSort, setPlayerSort] = useState<PlayerSort>('kda');

  const statsQuery = api.stats.getLeagueStats.useQuery({ role });

  const players = statsQuery.data?.players ?? [];
  const teams = statsQuery.data?.teams ?? [];
  const champions = statsQuery.data?.champions ?? [];

  const sortedPlayers = [...players].sort((a, b) => {
    if (playerSort === 'avgDeaths') return a[playerSort] - b[playerSort];
    return b[playerSort] - a[playerSort];
  });

  return (
    <div className="flex flex-col gap-10">
      <nav
        aria-label="Mode de stats"
        className="flex items-center gap-6 border-b border-hairline"
      >
        {(['players', 'teams', 'champions'] as const).map((t) => (
          <StatsTab
            key={t}
            active={tab === t}
            label={TAB_LABELS[t]}
            onClick={() => setTab(t)}
          />
        ))}
      </nav>

      {tab === 'players' ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={role === undefined}
            label="Tous"
            onClick={() => setRole(undefined)}
          />
          {ROLES.map((r) => (
            <FilterChip
              key={r}
              active={role === r}
              label={r}
              onClick={() => setRole(r)}
            />
          ))}
        </div>
      ) : null}

      {statsQuery.isLoading ? (
        <div className="flex items-center justify-center gap-3 border-y border-hairline py-16 text-sm text-foreground-dim">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des statistiques…
        </div>
      ) : null}

      {tab === 'players' && !statsQuery.isLoading ? (
        <div className="flex flex-col gap-6">
          <div>
            <p className="label-mono">§ Trier par</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLAYER_SORT_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  active={playerSort === opt.value}
                  label={opt.label}
                  onClick={() => setPlayerSort(opt.value)}
                />
              ))}
            </div>
          </div>

          {sortedPlayers.length > 0 ? (
            <div className="overflow-x-auto border-t border-hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>KDA</TableHead>
                    <TableHead>K</TableHead>
                    <TableHead>D</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead>CS/min</TableHead>
                    <TableHead>Dmg</TableHead>
                    <TableHead>Vision</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Champs</TableHead>
                    <TableHead>Main</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player, index) => (
                    <TableRow key={player.playerId}>
                      <TableCell className="font-display tabular-nums text-foreground-muted">
                        {(index + 1).toString().padStart(2, '0')}
                      </TableCell>
                      <TableCell>
                        <PlayerLink
                          playerId={player.playerId}
                          className="font-display text-foreground"
                        >
                          {player.displayName}
                        </PlayerLink>
                      </TableCell>
                      <TableCell className="label-mono">{player.teamShortCode}</TableCell>
                      <TableCell>
                        <Badge variant={player.role as PlayerRole}>{player.role}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{player.games}</TableCell>
                      <TableCell className="tabular-nums">
                        {(player.winRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="font-display tabular-nums text-accent">
                        {player.kda.toFixed(2)}
                      </TableCell>
                      <TableCell className="tabular-nums">{player.avgKills.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{player.avgDeaths.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{player.avgAssists.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{player.csPerMin.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{player.avgDamage.toFixed(0)}</TableCell>
                      <TableCell className="tabular-nums">{player.avgVisionScore.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{player.avgGold.toFixed(0)}</TableCell>
                      <TableCell className="tabular-nums">{player.uniqueChampions}</TableCell>
                      <TableCell>
                        {player.mostPlayedChampion ? (
                          <span className="flex items-center gap-2">
                            <ChampionIcon championId={player.mostPlayedChampion} size="sm" />
                            <span className="label-mono tabular-nums">
                              ({player.mostPlayedChampionGames})
                            </span>
                          </span>
                        ) : (
                          <span className="text-foreground-muted">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-hairline bg-surface px-5 py-6">
              <p className="text-sm text-foreground-dim">
                Aucune statistique disponible{role ? ` pour le rôle ${role}` : ''}.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'teams' && !statsQuery.isLoading ? (
        <div className="flex flex-col gap-6">
          {teams.length > 0 ? (
            <div className="overflow-x-auto border-t border-hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>Team KDA</TableHead>
                    <TableHead>Blue WR%</TableHead>
                    <TableHead>Red WR%</TableHead>
                    <TableHead>Blue games</TableHead>
                    <TableHead>Red games</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team, index) => (
                    <TableRow key={team.teamId}>
                      <TableCell className="font-display tabular-nums text-foreground-muted">
                        {(index + 1).toString().padStart(2, '0')}
                      </TableCell>
                      <TableCell className="font-display text-foreground">
                        {team.teamName}
                        <span className="ml-2 label-mono">{team.teamShortCode}</span>
                      </TableCell>
                      <TableCell className="tabular-nums">{team.games}</TableCell>
                      <TableCell className="font-display tabular-nums text-accent">
                        {(team.winRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="tabular-nums">{team.teamKda.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">
                        {team.blueSideGames > 0
                          ? `${(team.blueSideWinRate * 100).toFixed(0)}%`
                          : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {team.redSideGames > 0
                          ? `${(team.redSideWinRate * 100).toFixed(0)}%`
                          : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums">{team.blueSideGames}</TableCell>
                      <TableCell className="tabular-nums">{team.redSideGames}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-hairline bg-surface px-5 py-6">
              <p className="text-sm text-foreground-dim">
                Aucune statistique équipe disponible.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'champions' && !statsQuery.isLoading ? (
        <div className="flex flex-col gap-6">
          {champions.length > 0 ? (
            <div className="overflow-x-auto border-t border-hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Champion</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>KDA</TableHead>
                    <TableHead>Avg K</TableHead>
                    <TableHead>Avg D</TableHead>
                    <TableHead>Avg A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {champions.map((champ, index) => (
                    <TableRow key={champ.champion}>
                      <TableCell className="font-display tabular-nums text-foreground-muted">
                        {(index + 1).toString().padStart(2, '0')}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-display text-foreground">
                          <ChampionIcon championId={champ.champion} size="sm" />
                          {champ.champion}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{champ.games}</TableCell>
                      <TableCell className="font-display tabular-nums text-accent">
                        {(champ.winRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="tabular-nums">{champ.kda.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">{champ.avgKills.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{champ.avgDeaths.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{champ.avgAssists.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-hairline bg-surface px-5 py-6">
              <p className="text-sm text-foreground-dim">
                Aucune statistique champion disponible.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
