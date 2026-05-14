import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { PerformanceTrendsChart } from '@/components/features/charts/performance-trends-chart';
import { Badge } from '@/components/ui/badge';
import { PlayerLink } from '@/components/ui/player-link';
import { PlayerValue } from '@/components/ui/player-value';
import { Select } from '@/components/ui/select';
import { TeamAvatar } from '@/components/ui/team-avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

interface PlayerComparisonPageProps {
  searchParams: Promise<{
    playerA?: string | string[];
    playerB?: string | string[];
    playerC?: string | string[];
  }>;
}

function getSearchValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function getSelectedIds(values: Array<string | undefined>, fallbackIds: string[]) {
  const explicitIds = values.filter((value): value is string => Boolean(value));
  const targetCount = explicitIds.length >= 3 ? 3 : 2;

  return [...new Set([...explicitIds, ...fallbackIds])].slice(0, targetCount);
}

export default async function PlayerComparisonPage({
  searchParams,
}: PlayerComparisonPageProps) {
  const params = await searchParams;
  const caller = await getServerCaller();
  const allPlayers = await caller.player.getAll({ sort: 'marketValue-desc' });

  if (allPlayers.length === 0) {
    return (
      <div className="flex flex-col gap-16 md:gap-20">
        <header className="border-b border-hairline pb-8">
          <p className="breadcrumb-mono">§ · Transfermarket · Comparaison</p>
          <h1 className="mt-4 display-lg text-foreground">Aucun joueur disponible.</h1>
          <p className="mt-4 text-base leading-7 text-foreground-dim">
            Ajoutez des joueurs au transfermarket avant d&apos;utiliser cette page.
          </p>
        </header>
      </div>
    );
  }

  const selectedIds = getSelectedIds(
    [
      getSearchValue(params.playerA),
      getSearchValue(params.playerB),
      getSearchValue(params.playerC),
    ],
    allPlayers.map((player) => player.id),
  );

  const comparedPlayers = await Promise.all(
    selectedIds.map(async (playerId) => {
      const [player, stats] = await Promise.all([
        caller.player.getById({ id: playerId }),
        caller.stats.getPlayerStats({ playerId }),
      ]);

      const activeContract = player.contracts[0] ?? null;
      const marketDelta =
        player.marketValueHistory[0]?.newValue !== undefined
          ? player.marketValueHistory[0].newValue - player.marketValueHistory[0].previousValue
          : 0;
      const winRate =
        stats.summary.games > 0
          ? Math.round((stats.summary.wins / stats.summary.games) * 100)
          : 0;
      const kda =
        stats.summary.games > 0
          ? ((stats.summary.avgKills + stats.summary.avgAssists) / Math.max(stats.summary.avgDeaths, 1)).toFixed(2)
          : '0.00';

      return {
        player,
        stats,
        activeContract,
        marketDelta,
        winRate,
        kda,
      };
    }),
  );

  const comparisonRows = [
    {
      label: 'Market value',
      values: comparedPlayers.map((entry) => formatCurrency(entry.player.marketValue)),
    },
    {
      label: 'Salary',
      values: comparedPlayers.map((entry) => formatCurrency(entry.player.salary)),
    },
    {
      label: 'Games tracked',
      values: comparedPlayers.map((entry) => entry.stats.summary.games.toString()),
    },
    {
      label: 'Win rate',
      values: comparedPlayers.map((entry) => `${entry.winRate}%`),
    },
    {
      label: 'KDA',
      values: comparedPlayers.map((entry) => entry.kda),
    },
    {
      label: 'Average CS',
      values: comparedPlayers.map((entry) => Math.round(entry.stats.summary.avgCs).toString()),
    },
    {
      label: 'Average damage',
      values: comparedPlayers.map((entry) => formatCurrency(Math.round(entry.stats.summary.avgDamage))),
    },
    {
      label: 'Durée contrat',
      values: comparedPlayers.map((entry) =>
        entry.activeContract ? `${entry.activeContract.durationBo3} BO3` : 'N/A',
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="flex flex-col gap-6 border-b border-hairline pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="breadcrumb-mono">§ · Transfermarket · Comparaison</p>
          <h1 className="mt-4 display-lg text-foreground">Comparaison de joueurs.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
            Compare les profils, la valorisation et les performances récentes côte à côte pour
            accélérer les décisions de recrutement.
          </p>
        </div>
        <Link
          href="/transfermarket"
          className="inline-flex items-center gap-2 border border-hairline bg-surface px-4 py-2 label-mono text-foreground transition hover:border-accent hover:text-accent"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Retour au transfermarket
        </Link>
      </header>

      <section>
        <p className="label-mono">§ 01 Sélection</p>
        <h2 className="mt-3 display-md text-foreground">Choisir les profils.</h2>
        <form className="mt-8 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]" method="get">
          <Select name="playerA" defaultValue={selectedIds[0] ?? ''}>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName} — {buildPlayerRiotId(player)} ({player.teamName})
              </option>
            ))}
          </Select>
          <Select name="playerB" defaultValue={selectedIds[1] ?? ''}>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName} — {buildPlayerRiotId(player)} ({player.teamName})
              </option>
            ))}
          </Select>
          <Select name="playerC" defaultValue={selectedIds[2] ?? ''}>
            <option value="">Pas de troisième joueur</option>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName} — {buildPlayerRiotId(player)} ({player.teamName})
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center border border-accent bg-accent px-5 label-mono text-background transition hover:bg-foreground hover:text-background"
          >
            Comparer
          </button>
        </form>
      </section>

      <section
        className={`grid gap-px bg-hairline ${
          comparedPlayers.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'
        }`}
      >
        {comparedPlayers.map((entry) => (
          <div key={entry.player.id} className="flex flex-col gap-6 bg-background p-6">
            <div className="flex items-start gap-4">
              {entry.player.imageUrl ? (
                <img
                  src={entry.player.imageUrl}
                  alt={entry.player.displayName}
                  loading="lazy"
                  decoding="async"
                  className="placeholder-diag h-20 w-20 object-cover"
                />
              ) : (
                <div className="placeholder-diag flex h-20 w-20 items-center justify-center font-display text-2xl text-foreground">
                  {getPlayerInitials(entry.player.displayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.player.role}>{entry.player.role}</Badge>
                  {entry.player.secondaryRoles.map((secondaryRole) => (
                    <Badge key={secondaryRole} variant={secondaryRole}>
                      {secondaryRole}
                    </Badge>
                  ))}
                </div>
                <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground">
                  <PlayerLink playerId={entry.player.id} className="font-display text-foreground">
                    {entry.player.displayName}
                  </PlayerLink>
                </h2>
                <div className="mt-2 flex items-center gap-2 label-mono text-foreground-dim">
                  <TeamAvatar
                    name={entry.player.team?.name ?? 'Free Agent'}
                    shortCode={entry.player.team?.shortCode ?? 'FA'}
                    logoUrl={entry.player.team?.logoUrl ?? null}
                    size="sm"
                    className="h-5 w-5 text-[0.55rem]"
                  />
                  <span>{entry.player.team?.name ?? 'Free Agent'}</span>
                  <span>·</span>
                  <span>{buildPlayerRiotId(entry.player)}</span>
                </div>
              </div>
            </div>

            <PlayerValue value={entry.player.marketValue} delta={entry.marketDelta} size="sm" />

            <div className="grid gap-px bg-hairline sm:grid-cols-2">
              <div className="bg-background p-4">
                <p className="label-mono">Salary</p>
                <p className="mt-3 font-display text-xl tabular-nums text-foreground">
                  {formatCurrency(entry.player.salary)}
                </p>
              </div>
              <div className="bg-background p-4">
                <p className="label-mono">Win rate</p>
                <p className="mt-3 font-display text-xl tabular-nums text-foreground">
                  {entry.winRate}%
                </p>
              </div>
            </div>

            <div>
              <p className="label-mono">Recent trend</p>
              <h3 className="mt-3 display-md text-foreground">Performance récente.</h3>
              <div className="mt-6">
                <PerformanceTrendsChart stats={entry.stats.recentGames} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <p className="label-mono">§ 02 Head to head</p>
        <h2 className="mt-3 display-md text-foreground">Grille de comparaison.</h2>
        <div className="mt-8 border-t border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {comparedPlayers.map((entry) => (
                  <TableHead key={entry.player.id}>
                    <PlayerLink playerId={entry.player.id} className="font-display text-foreground">
                      {entry.player.displayName}
                    </PlayerLink>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-display text-foreground">{row.label}</TableCell>
                  {row.values.map((value, index) => (
                    <TableCell
                      key={`${row.label}-${comparedPlayers[index]!.player.id}`}
                      className="tabular-nums"
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
