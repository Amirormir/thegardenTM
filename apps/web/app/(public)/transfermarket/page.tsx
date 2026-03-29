import Link from 'next/link';
import { MarketFilters } from '@/components/features/transfermarket/market-filters';
import { PlayerCard } from '@/components/features/transfermarket/player-card';
import { TopPlayersShowcase } from '@/components/features/transfermarket/top-players-showcase';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface TransfermarketPageProps {
  searchParams: Promise<{
    q?: string | string[];
    role?: string | string[];
    sort?: string | string[];
  }>;
}

const sortOptions = [
  'marketValue-desc',
  'marketValue-asc',
  'salary-desc',
  'salary-asc',
  'name-asc',
] as const;

const roleOptions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;

type SortValue = (typeof sortOptions)[number];
type RoleValue = (typeof roleOptions)[number];

function getSearchValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function getRoleValue(value: string | undefined): RoleValue | undefined {
  return roleOptions.includes((value ?? '') as RoleValue) ? (value as RoleValue) : undefined;
}

function getSortValue(value: string | undefined): SortValue {
  return sortOptions.includes((value ?? '') as SortValue) ? (value as SortValue) : 'marketValue-desc';
}

export default async function TransfermarketPage({ searchParams }: TransfermarketPageProps) {
  const params = await searchParams;
  const search = getSearchValue(params.q);
  const role = getRoleValue(getSearchValue(params.role));
  const sort = getSortValue(getSearchValue(params.sort));
  const caller = await getServerCaller();
  const players = await caller.player.getAll({
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    sort,
  });

  const totalMarketValue = players.reduce((sum, player) => sum + player.marketValue, 0);
  const averageMarketValue = players.length > 0 ? Math.round(totalMarketValue / players.length) : 0;
  const highestValuePlayer = players[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-kicker">Transfermarket</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">Liste des joueurs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
            Premier vertical metier branche en SSR : vraies donnees Prisma via tRPC, filtres URL
            et cartes premium exploitables pour le scouting.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <Link
            href="/transfermarket/comparison"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent-primary/40 hover:bg-accent-primary/14"
          >
            Comparer des joueurs
          </Link>
          <MarketFilters search={search} role={role ?? 'all'} sort={sort} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-kicker">Actifs sur le marche</p>
          <p className="font-display text-3xl font-bold text-white">{players.length}</p>
          <p className="text-sm text-text-secondary">
            Resultat filtre{players.length > 1 ? 's' : ''} pour la recherche actuelle.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-kicker">Top asset</p>
          <p className="font-display text-3xl font-bold text-white">
            {highestValuePlayer ? highestValuePlayer.gameName : 'N/A'}
          </p>
          <p className="text-sm text-text-secondary">
            {highestValuePlayer
              ? `${highestValuePlayer.teamName} • ${formatCurrency(highestValuePlayer.marketValue)}`
              : 'Aucun joueur disponible'}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-kicker">Valeur moyenne</p>
          <p className="font-display text-3xl font-bold text-white">
            {formatCurrency(averageMarketValue)}
          </p>
          <p className="text-sm text-text-secondary">
            Benchmark rapide pour les comparaisons de roster.
          </p>
        </Card>
      </section>

      {players.length >= 3 && sort === 'marketValue-desc' ? (
        <TopPlayersShowcase players={players} />
      ) : null}

      {players.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(players.length >= 3 && sort === 'marketValue-desc' ? players.slice(3) : players).map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <Card className="space-y-3">
          <p className="text-kicker">Aucun resultat</p>
          <h2 className="font-display text-2xl font-bold text-white">
            Aucun joueur ne correspond aux filtres actuels
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary">
            Change la recherche, le role ou reinitialise les filtres pour revenir a la vue complete
            du marche.
          </p>
        </Card>
      )}
    </div>
  );
}
