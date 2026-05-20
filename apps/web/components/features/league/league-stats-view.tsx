'use client';

import type { inferRouterOutputs } from '@trpc/server';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { PlayerLink } from '@/components/ui/player-link';
import { Select } from '@/components/ui/select';
import { KpiBanner } from '@/components/features/stats/kpi-banner';
import {
  StatsTable,
  type SortDirection,
  type StatsTableColumn,
} from '@/components/features/stats/stats-table';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import type { AppRouter } from '@/server/routers/_app';
import { Loader2 } from 'lucide-react';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PlayerRow = RouterOutputs['stats']['getPlayerLeaderboard']['rows'][number];
type TeamRow = RouterOutputs['stats']['getTeamLeaderboard']['rows'][number];
type ChampionRow = RouterOutputs['stats']['getChampionLeaderboard']['rows'][number];

type PlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
type StatsTab = 'players' | 'teams' | 'champions';

const ROLES: PlayerRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const TAB_LABELS: Record<StatsTab, string> = {
  players: 'Joueurs',
  teams: 'Équipes',
  champions: 'Champions',
};

export interface SeasonOption {
  id: string;
  name: string;
  year: number;
  isCurrent: boolean;
}

export interface LeagueStatsViewProps {
  seasons: SeasonOption[];
  defaultSeasonId: string | null;
}

function formatRate(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(digits);
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TabButton({
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
        <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px bg-accent" />
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

export function LeagueStatsView({ seasons, defaultSeasonId }: LeagueStatsViewProps) {
  const [tab, setTab] = useState<StatsTab>('players');
  const [role, setRole] = useState<PlayerRole | undefined>(undefined);
  const [seasonId, setSeasonId] = useState<string>(defaultSeasonId ?? '');

  const [playerSortKey, setPlayerSortKey] = useState<string>('kda');
  const [playerSortDir, setPlayerSortDir] = useState<SortDirection>('desc');
  const [teamSortKey, setTeamSortKey] = useState<string>('winRate');
  const [teamSortDir, setTeamSortDir] = useState<SortDirection>('desc');
  const [championSortKey, setChampionSortKey] = useState<string>('presenceRate');
  const [championSortDir, setChampionSortDir] = useState<SortDirection>('desc');

  const enabled = seasonId !== '';

  const overviewQuery = api.stats.getSeasonOverview.useQuery(
    { seasonId },
    { enabled },
  );
  const playersQuery = api.stats.getPlayerLeaderboard.useQuery(
    enabled ? { seasonId, ...(role ? { role } : {}) } : { seasonId: '' },
    { enabled: enabled && tab === 'players' },
  );
  const teamsQuery = api.stats.getTeamLeaderboard.useQuery(
    { seasonId },
    { enabled: enabled && tab === 'teams' },
  );
  const championsQuery = api.stats.getChampionLeaderboard.useQuery(
    enabled ? { seasonId, ...(role ? { role } : {}) } : { seasonId: '' },
    { enabled: enabled && tab === 'champions' },
  );

  const playerRows = playersQuery.data?.rows ?? [];
  const teamRows = teamsQuery.data?.rows ?? [];
  const championRows = championsQuery.data?.rows ?? [];

  const overview = overviewQuery.data ?? null;
  const kpiTiles = overview
    ? [
        { label: 'Drafts joués', value: overview.totalDrafts.toString() },
        {
          label: 'Drafts décidés',
          value: overview.decidedDrafts.toString(),
          hint:
            overview.totalDrafts > 0
              ? `${Math.round((overview.decidedDrafts / overview.totalDrafts) * 100)}% verrouillés`
              : undefined,
        },
        { label: 'Picks · bans', value: `${overview.totalPicks} · ${overview.totalBans}` },
        {
          label: 'Replays parsés',
          value: overview.parsedReplayGames.toString(),
          hint:
            overview.totalDrafts > 0
              ? `${Math.round((overview.parsedReplayGames / overview.totalDrafts) * 100)}% des drafts`
              : undefined,
        },
      ]
    : [
        { label: 'Drafts joués', value: '—' },
        { label: 'Drafts décidés', value: '—' },
        { label: 'Picks · bans', value: '—' },
        { label: 'Replays parsés', value: '—' },
      ];

  if (seasons.length === 0) {
    return (
      <div className="border border-hairline bg-surface px-5 py-6">
        <p className="text-sm text-foreground-dim">
          Aucune saison n&apos;est encore configurée.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="label-mono">§ Saison</p>
          <Select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="min-w-[240px]"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isCurrent ? ' · en cours' : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <KpiBanner tiles={kpiTiles} isLoading={overviewQuery.isLoading} />

      <nav aria-label="Mode de stats" className="flex items-center gap-6 border-b border-hairline">
        {(['players', 'teams', 'champions'] as const).map((t) => (
          <TabButton
            key={t}
            active={tab === t}
            label={TAB_LABELS[t]}
            onClick={() => setTab(t)}
          />
        ))}
      </nav>

      {tab === 'players' || tab === 'champions' ? (
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

      {tab === 'players' ? (
        <PlayersTab
          rows={playerRows}
          isLoading={playersQuery.isLoading}
          role={role}
          sortKey={playerSortKey}
          sortDirection={playerSortDir}
          onSortChange={(key, dir) => {
            setPlayerSortKey(key);
            setPlayerSortDir(dir);
          }}
        />
      ) : null}

      {tab === 'teams' ? (
        <TeamsTab
          rows={teamRows}
          isLoading={teamsQuery.isLoading}
          sortKey={teamSortKey}
          sortDirection={teamSortDir}
          onSortChange={(key, dir) => {
            setTeamSortKey(key);
            setTeamSortDir(dir);
          }}
        />
      ) : null}

      {tab === 'champions' ? (
        <ChampionsTab
          rows={championRows}
          isLoading={championsQuery.isLoading}
          role={role}
          sortKey={championSortKey}
          sortDirection={championSortDir}
          onSortChange={(key, dir) => {
            setChampionSortKey(key);
            setChampionSortDir(dir);
          }}
        />
      ) : null}
    </div>
  );
}

function PlayersTab({
  rows,
  isLoading,
  role,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  rows: PlayerRow[];
  isLoading: boolean;
  role: PlayerRole | undefined;
  sortKey: string;
  sortDirection: SortDirection;
  onSortChange: (key: string, dir: SortDirection) => void;
}) {
  if (isLoading) return <LoaderRow label="Chargement des joueurs…" />;

  const columns: StatsTableColumn<PlayerRow>[] = [
    {
      key: 'rank',
      label: '#',
      render: (_row, i) => (
        <span className="font-display tabular-nums text-foreground-muted">
          {(i + 1).toString().padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'player',
      label: 'Joueur',
      render: (row) => (
        <PlayerLink playerId={row.playerId} className="font-display text-foreground">
          {row.displayName}
        </PlayerLink>
      ),
      sortAccessor: (row) => row.displayName,
      defaultDirection: 'asc',
    },
    {
      key: 'team',
      label: 'Équipe',
      render: (row) => <span className="label-mono">{row.teamShortCode}</span>,
      sortAccessor: (row) => row.teamShortCode,
      defaultDirection: 'asc',
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (row) => <Badge variant={row.role as PlayerRole}>{row.role}</Badge>,
    },
    {
      key: 'games',
      label: 'Games',
      render: (row) => <span className="tabular-nums">{row.games}</span>,
      sortAccessor: (row) => row.games,
    },
    {
      key: 'winRate',
      label: 'Win%',
      render: (row) => <span className="tabular-nums">{formatRate(row.winRate)}</span>,
      sortAccessor: (row) => row.winRate,
    },
    {
      key: 'kda',
      label: 'KDA',
      render: (row) => (
        <span className="font-display tabular-nums text-accent">{row.kda.toFixed(2)}</span>
      ),
      sortAccessor: (row) => row.kda,
    },
    {
      key: 'avgKills',
      label: 'K',
      render: (row) => <span className="tabular-nums">{row.avgKills.toFixed(1)}</span>,
      sortAccessor: (row) => row.avgKills,
    },
    {
      key: 'avgDeaths',
      label: 'D',
      render: (row) => <span className="tabular-nums">{row.avgDeaths.toFixed(1)}</span>,
      sortAccessor: (row) => row.avgDeaths,
      defaultDirection: 'asc',
    },
    {
      key: 'avgAssists',
      label: 'A',
      render: (row) => <span className="tabular-nums">{row.avgAssists.toFixed(1)}</span>,
      sortAccessor: (row) => row.avgAssists,
    },
    {
      key: 'avgCsPerMin',
      label: 'CS/min',
      render: (row) => <span className="tabular-nums">{row.avgCsPerMin.toFixed(1)}</span>,
      sortAccessor: (row) => row.avgCsPerMin,
    },
    {
      key: 'avgDamagePerMin',
      label: 'Dmg/min',
      render: (row) => <span className="tabular-nums">{row.avgDamagePerMin.toFixed(0)}</span>,
      sortAccessor: (row) => row.avgDamagePerMin,
    },
    {
      key: 'avgVisionScore',
      label: 'Vision',
      render: (row) => <span className="tabular-nums">{row.avgVisionScore.toFixed(1)}</span>,
      sortAccessor: (row) => row.avgVisionScore,
    },
    {
      key: 'avgGoldPerMin',
      label: 'Gold/min',
      render: (row) => <span className="tabular-nums">{row.avgGoldPerMin.toFixed(0)}</span>,
      sortAccessor: (row) => row.avgGoldPerMin,
    },
    {
      key: 'uniqueChampions',
      label: 'Champs',
      render: (row) => <span className="tabular-nums">{row.uniqueChampions}</span>,
      sortAccessor: (row) => row.uniqueChampions,
    },
    {
      key: 'mostPlayed',
      label: 'Main',
      render: (row) =>
        row.mostPlayedChampion ? (
          <Link
            href={`/league/stats/champions/${row.mostPlayedChampion}`}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <ChampionIcon championId={row.mostPlayedChampion} size="sm" />
            <span className="label-mono tabular-nums">({row.mostPlayedChampionGames})</span>
          </Link>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
    },
  ];

  return (
    <StatsTable<PlayerRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.playerId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      emptyState={
        <div className="border border-hairline bg-surface px-5 py-6">
          <p className="text-sm text-foreground-dim">
            Aucun replay parsé{role ? ` pour le rôle ${role}` : ''} cette saison.
          </p>
        </div>
      }
    />
  );
}

function TeamsTab({
  rows,
  isLoading,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  rows: TeamRow[];
  isLoading: boolean;
  sortKey: string;
  sortDirection: SortDirection;
  onSortChange: (key: string, dir: SortDirection) => void;
}) {
  if (isLoading) return <LoaderRow label="Chargement des équipes…" />;

  const columns: StatsTableColumn<TeamRow>[] = [
    {
      key: 'rank',
      label: '#',
      render: (_row, i) => (
        <span className="font-display tabular-nums text-foreground-muted">
          {(i + 1).toString().padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'team',
      label: 'Équipe',
      render: (row) => (
        <span className="flex items-center gap-2 font-display text-foreground">
          {row.teamName}
          <span className="label-mono">{row.teamShortCode}</span>
        </span>
      ),
      sortAccessor: (row) => row.teamName,
      defaultDirection: 'asc',
    },
    {
      key: 'drafts',
      label: 'Drafts',
      render: (row) => <span className="tabular-nums">{row.drafts}</span>,
      sortAccessor: (row) => row.drafts,
    },
    {
      key: 'wlRecord',
      label: 'W / L',
      render: (row) => (
        <span className="tabular-nums">
          {row.wins} / {row.losses}
        </span>
      ),
    },
    {
      key: 'winRate',
      label: 'Win%',
      render: (row) => (
        <span className="font-display tabular-nums text-accent">{formatRate(row.winRate)}</span>
      ),
      sortAccessor: (row) => row.winRate,
    },
    {
      key: 'blueSideWinRate',
      label: 'Blue WR%',
      render: (row) => <span className="tabular-nums">{formatRate(row.blueSideWinRate)}</span>,
      sortAccessor: (row) => row.blueSideWinRate,
    },
    {
      key: 'redSideWinRate',
      label: 'Red WR%',
      render: (row) => <span className="tabular-nums">{formatRate(row.redSideWinRate)}</span>,
      sortAccessor: (row) => row.redSideWinRate,
    },
    {
      key: 'sideSplit',
      label: 'Blue · Red',
      render: (row) => (
        <span className="label-mono tabular-nums">
          {row.blueSideGames} · {row.redSideGames}
        </span>
      ),
    },
    {
      key: 'teamKda',
      label: 'Team KDA',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{row.performance.teamKda.toFixed(2)}</span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.teamKda : null),
    },
    {
      key: 'avgKills',
      label: 'Kills/g',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">
            {(row.performance.avgKillsPerGame * 5).toFixed(1)}
          </span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.avgKillsPerGame : null),
    },
    {
      key: 'avgDuration',
      label: 'Durée',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{formatDuration(row.performance.avgGameDurationSeconds)}</span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.avgGameDurationSeconds : null),
    },
    {
      key: 'replays',
      label: 'Replays',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{row.performance.games}</span>
        ) : (
          <span className="text-foreground-muted">0</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.games : null),
    },
  ];

  return (
    <StatsTable<TeamRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.teamId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      emptyState={
        <div className="border border-hairline bg-surface px-5 py-6">
          <p className="text-sm text-foreground-dim">
            Aucune équipe n&apos;a encore joué de draft cette saison.
          </p>
        </div>
      }
    />
  );
}

function ChampionsTab({
  rows,
  isLoading,
  role,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  rows: ChampionRow[];
  isLoading: boolean;
  role: PlayerRole | undefined;
  sortKey: string;
  sortDirection: SortDirection;
  onSortChange: (key: string, dir: SortDirection) => void;
}) {
  if (isLoading) return <LoaderRow label="Chargement des champions…" />;

  const columns: StatsTableColumn<ChampionRow>[] = [
    {
      key: 'rank',
      label: '#',
      render: (_row, i) => (
        <span className="font-display tabular-nums text-foreground-muted">
          {(i + 1).toString().padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'champion',
      label: 'Champion',
      render: (row) => (
        <Link
          href={`/league/stats/champions/${row.championId}`}
          className="flex items-center gap-2 font-display text-foreground transition-colors hover:text-accent"
        >
          <ChampionIcon championId={row.championId} size="sm" />
          {row.championId}
        </Link>
      ),
      sortAccessor: (row) => row.championId,
      defaultDirection: 'asc',
    },
    {
      key: 'presenceRate',
      label: 'Présence',
      render: (row) => (
        <span className="font-display tabular-nums text-accent">
          {formatRate(row.presenceRate)}
        </span>
      ),
      sortAccessor: (row) => row.presenceRate,
    },
    {
      key: 'pickCount',
      label: 'Picks',
      render: (row) => <span className="tabular-nums">{row.pickCount}</span>,
      sortAccessor: (row) => row.pickCount,
    },
    {
      key: 'banCount',
      label: 'Bans',
      render: (row) => <span className="tabular-nums">{row.banCount}</span>,
      sortAccessor: (row) => row.banCount,
    },
    {
      key: 'winRate',
      label: 'Win% draft',
      render: (row) => (
        <span className="font-display tabular-nums text-foreground">
          {formatRate(row.winRate)}
        </span>
      ),
      sortAccessor: (row) => row.winRate,
    },
    {
      key: 'wlRecord',
      label: 'W / L',
      render: (row) => (
        <span className="tabular-nums">
          {row.winCount} / {row.lossCount}
        </span>
      ),
    },
    {
      key: 'perfKda',
      label: 'KDA',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{row.performance.kda.toFixed(2)}</span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.kda : null),
    },
    {
      key: 'perfDmgPerMin',
      label: 'Dmg/min',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{row.performance.avgDamagePerMin.toFixed(0)}</span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.avgDamagePerMin : null),
    },
    {
      key: 'perfCsPerMin',
      label: 'CS/min',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">
            {formatNumber(row.performance.avgCsPerMin, 1)}
          </span>
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.avgCsPerMin : null),
    },
    {
      key: 'perfGames',
      label: 'Replays',
      render: (row) =>
        row.performance ? (
          <span className="tabular-nums">{row.performance.games}</span>
        ) : (
          <span className="text-foreground-muted">0</span>
        ),
      sortAccessor: (row) => (row.performance ? row.performance.games : null),
    },
  ];

  return (
    <StatsTable<ChampionRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.championId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      emptyState={
        <div className="border border-hairline bg-surface px-5 py-6">
          <p className="text-sm text-foreground-dim">
            Aucun draft enregistré{role ? ` pour le rôle ${role}` : ''} cette saison.
          </p>
        </div>
      }
    />
  );
}

function LoaderRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 border-y border-hairline py-16 text-sm text-foreground-dim">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}
