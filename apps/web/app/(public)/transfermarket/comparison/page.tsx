import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { PerformanceTrendsChart } from '@/components/features/charts/performance-trends-chart';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCompactDate, formatCurrency } from '@/lib/utils/format';
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
      <Card className="space-y-3">
        <p className="text-kicker">Comparison</p>
        <h1 className="font-display text-3xl font-bold text-white">
          Aucun joueur disponible pour la comparaison
        </h1>
        <p className="text-sm leading-7 text-text-secondary">
          Ajoute des joueurs au transfermarket avant d utiliser cette page.
        </p>
      </Card>
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
      label: 'Duree contrat',
      values: comparedPlayers.map((entry) =>
        entry.activeContract ? `${entry.activeContract.durationBo3} BO3` : 'N/A',
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-kicker">Scouting tools</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">
            Comparaison de joueurs
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
            Compare les profils, la valorisation et les performances recentes cote a cote pour
            accelerer les decisions de recrutement.
          </p>
        </div>
        <Link
          href="/transfermarket"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent-primary/40 hover:bg-accent-primary/14"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Retour au transfermarket
        </Link>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-kicker">Selection</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Choisir les profils</h2>
        </div>
        <form className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]" method="get">
          <Select name="playerA" defaultValue={selectedIds[0] ?? ''}>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.gameName} ({player.teamName})
              </option>
            ))}
          </Select>
          <Select name="playerB" defaultValue={selectedIds[1] ?? ''}>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.gameName} ({player.teamName})
              </option>
            ))}
          </Select>
          <Select name="playerC" defaultValue={selectedIds[2] ?? ''}>
            <option value="">Pas de troisieme joueur</option>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.gameName} ({player.teamName})
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent-primary px-5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.35)] transition hover:-translate-y-0.5 hover:bg-[#8b5cf6]"
          >
            Comparer
          </button>
        </form>
      </Card>

      <section
        className={`grid gap-6 ${
          comparedPlayers.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'
        }`}
      >
        {comparedPlayers.map((entry) => (
          <Card key={entry.player.id} className="space-y-5">
            <div className="flex items-start gap-4">
              {entry.player.imageUrl ? (
                <img
                  src={entry.player.imageUrl}
                  alt={entry.player.gameName}
                  className="h-20 w-20 rounded-[24px] object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/8 text-xl font-bold text-white ring-1 ring-white/10">
                  {entry.player.gameName.slice(0, 2).toUpperCase()}
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
                <h2 className="mt-3 font-display text-3xl font-bold text-white">
                  {entry.player.gameName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {entry.player.team?.name ?? 'Free Agent'} / #{entry.player.tagLine}
                </p>
              </div>
            </div>

            <PlayerValue value={entry.player.marketValue} delta={entry.marketDelta} size="sm" />

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-white/8 bg-white/4">
                <p className="text-kicker">Salary</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatCurrency(entry.player.salary)}
                </p>
              </Card>
              <Card className="border-white/8 bg-white/4">
                <p className="text-kicker">Win rate</p>
                <p className="mt-2 text-xl font-semibold text-white">{entry.winRate}%</p>
              </Card>
            </div>

            <div>
              <p className="text-kicker">Recent trend</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-white">
                Performance recente
              </h3>
            </div>
            <PerformanceTrendsChart stats={entry.stats.recentGames} />
          </Card>
        ))}
      </section>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Head to head</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">
            Grille de comparaison
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              {comparedPlayers.map((entry) => (
                <TableHead key={entry.player.id}>{entry.player.gameName}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-semibold text-white">{row.label}</TableCell>
                {row.values.map((value, index) => (
                  <TableCell key={`${row.label}-${comparedPlayers[index]!.player.id}`}>{value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
