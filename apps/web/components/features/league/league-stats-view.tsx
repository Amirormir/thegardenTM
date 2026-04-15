'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
  { value: 'uniqueChampions', label: 'Champions joues' },
];

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {(['players', 'teams', 'champions'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === t
                  ? 'bg-white text-[#12111a]'
                  : 'text-white/78 hover:bg-white/8 hover:text-white',
              )}
            >
              {t === 'players' ? 'Joueurs' : t === 'teams' ? 'Equipes' : 'Champions'}
            </button>
          ))}
        </div>

        {tab === 'players' ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRole(undefined)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                role === undefined
                  ? 'bg-accent-primary text-white'
                  : 'border border-white/10 bg-white/5 text-white/60 hover:text-white',
              )}
            >
              Tous
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  role === r
                    ? 'bg-accent-primary text-white'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {statsQuery.isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des statistiques...
        </div>
      ) : null}

      {tab === 'players' && !statsQuery.isLoading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PLAYER_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlayerSort(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  playerSort === opt.value
                    ? 'bg-white text-[#12111a]'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {sortedPlayers.length > 0 ? (
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Role</TableHead>
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
                      <TableCell className="font-mono text-text-secondary">{index + 1}</TableCell>
                      <TableCell>
                        <PlayerLink playerId={player.playerId} className="font-semibold text-white">
                          {player.displayName}
                        </PlayerLink>
                      </TableCell>
                      <TableCell className="text-text-secondary">{player.teamShortCode}</TableCell>
                      <TableCell>
                        <Badge variant={player.role as PlayerRole}>{player.role}</Badge>
                      </TableCell>
                      <TableCell>{player.games}</TableCell>
                      <TableCell className="font-mono">{(player.winRate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="font-mono font-semibold text-accent-glow">
                        {player.kda.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">{player.avgKills.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{player.avgDeaths.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{player.avgAssists.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{player.csPerMin.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{player.avgDamage.toFixed(0)}</TableCell>
                      <TableCell className="font-mono">{player.avgVisionScore.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{player.avgGold.toFixed(0)}</TableCell>
                      <TableCell className="font-mono">{player.uniqueChampions}</TableCell>
                      <TableCell>
                        {player.mostPlayedChampion ? (
                          <span className="flex items-center gap-1.5">
                            <ChampionIcon championId={player.mostPlayedChampion} size="sm" />
                            <span className="text-xs text-text-secondary">
                              ({player.mostPlayedChampionGames})
                            </span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">
                Aucune statistique disponible{role ? ` pour le role ${role}` : ''}.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'teams' && !statsQuery.isLoading ? (
        <div className="space-y-4">
          {teams.length > 0 ? (
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Equipe</TableHead>
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
                      <TableCell className="font-mono text-text-secondary">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-white">
                        {team.teamName}
                        <span className="ml-2 text-xs text-text-secondary">
                          {team.teamShortCode}
                        </span>
                      </TableCell>
                      <TableCell>{team.games}</TableCell>
                      <TableCell className="font-mono font-semibold text-accent-glow">
                        {(team.winRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="font-mono">{team.teamKda.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">
                        {team.blueSideGames > 0
                          ? `${(team.blueSideWinRate * 100).toFixed(0)}%`
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {team.redSideGames > 0
                          ? `${(team.redSideWinRate * 100).toFixed(0)}%`
                          : '-'}
                      </TableCell>
                      <TableCell>{team.blueSideGames}</TableCell>
                      <TableCell>{team.redSideGames}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">Aucune statistique equipe disponible.</p>
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'champions' && !statsQuery.isLoading ? (
        <div className="space-y-4">
          {champions.length > 0 ? (
            <Card className="overflow-x-auto p-0">
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
                      <TableCell className="font-mono text-text-secondary">{index + 1}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-semibold text-white">
                          <ChampionIcon championId={champ.champion} size="sm" />
                          {champ.champion}
                        </span>
                      </TableCell>
                      <TableCell>{champ.games}</TableCell>
                      <TableCell className="font-mono font-semibold text-accent-glow">
                        {(champ.winRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="font-mono">{champ.kda.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{champ.avgKills.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{champ.avgDeaths.toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{champ.avgAssists.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">
                Aucune statistique champion disponible.
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
