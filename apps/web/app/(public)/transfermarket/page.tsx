import Link from 'next/link';
import { MarketFilters } from '@/components/features/transfermarket/market-filters';
import { PlayerCard } from '@/components/features/transfermarket/player-card';
import { TeamMarketValueRanking } from '@/components/features/transfermarket/team-market-value-ranking';
import { TopPlayersShowcase } from '@/components/features/transfermarket/top-players-showcase';
import { Card } from '@/components/ui/card';
import { PlayerLink } from '@/components/ui/player-link';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface TransfermarketPageProps {
  searchParams: Promise<{
    q?: string | string[];
    role?: string | string[];
    sort?: string | string[];
    view?: string | string[];
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
type TransferView = 'players' | 'teams';

function getSearchValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function getRoleValue(value: string | undefined): RoleValue | undefined {
  return roleOptions.includes((value ?? '') as RoleValue) ? (value as RoleValue) : undefined;
}

function getSortValue(value: string | undefined): SortValue {
  return sortOptions.includes((value ?? '') as SortValue) ? (value as SortValue) : 'marketValue-desc';
}

function getViewValue(value: string | undefined): TransferView {
  return value === 'teams' ? 'teams' : 'players';
}

function buildTransfermarketHref(options: {
  view: TransferView;
  search?: string | undefined;
  role?: RoleValue | undefined;
  sort?: SortValue | undefined;
}) {
  const query = new URLSearchParams();

  if (options.view === 'teams') {
    query.set('view', 'teams');
  }

  if (options.search) {
    query.set('q', options.search);
  }

  if (options.role) {
    query.set('role', options.role);
  }

  if (options.sort) {
    query.set('sort', options.sort);
  }

  const serialized = query.toString();
  return serialized ? `/transfermarket?${serialized}` : '/transfermarket';
}

export default async function TransfermarketPage({ searchParams }: TransfermarketPageProps) {
  const params = await searchParams;
  const search = getSearchValue(params.q);
  const role = getRoleValue(getSearchValue(params.role));
  const sort = getSortValue(getSearchValue(params.sort));
  const view = getViewValue(getSearchValue(params.view));
  const caller = await getServerCaller();

  const players =
    view === 'players'
      ? await caller.player.getAll({
          ...(search ? { search } : {}),
          ...(role ? { role } : {}),
          sort,
        })
      : [];
  const teams = view === 'teams' ? await caller.team.getMarketValueRanking() : [];

  const totalPlayerMarketValue = players.reduce((sum, player) => sum + player.marketValue, 0);
  const averagePlayerMarketValue =
    players.length > 0 ? Math.round(totalPlayerMarketValue / players.length) : 0;
  const highestValuePlayer = players[0] ?? null;
  const totalTeamMarketValue = teams.reduce((sum, team) => sum + team.totalMarketValue, 0);
  const averageTeamMarketValue =
    teams.length > 0 ? Math.round(totalTeamMarketValue / teams.length) : 0;
  const topTeam = teams[0] ?? null;
  const playersViewHref = buildTransfermarketHref({
    view: 'players',
    search,
    role,
    sort,
  });
  const teamsViewHref = buildTransfermarketHref({
    view: 'teams',
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-kicker">Transfermarket</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
            {view === 'players' ? 'Liste des joueurs' : 'Classement des equipes'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
            {view === 'players'
              ? 'Premier vertical metier branche en SSR : vraies donnees Prisma via tRPC, filtres URL et cartes premium exploitables pour le scouting.'
              : 'Lecture simple de la valeur marchande totale de chaque effectif, avec un fond de carte cale sur la couleur dominante du logo.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="inline-flex rounded-full border border-white/[0.05] bg-white/[0.035] p-1">
            <Link
              href={playersViewHref}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                view === 'players'
                  ? 'bg-white text-[#12111a]'
                  : 'text-white/78 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              Joueurs
            </Link>
            <Link
              href={teamsViewHref}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                view === 'teams'
                  ? 'bg-white text-[#12111a]'
                  : 'text-white/78 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              Equipe
            </Link>
          </div>
          {view === 'players' ? (
            <>
              <Link
                href="/transfermarket/comparison"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white transition hover:border-accent-primary/40 hover:bg-accent-primary/14"
              >
                Comparer des joueurs
              </Link>
              <MarketFilters search={search} role={role ?? 'all'} sort={sort} />
            </>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {view === 'players' ? (
          <>
            <Card className="space-y-2">
              <p className="text-kicker">Actifs sur le marche</p>
              <p className="font-display text-2xl font-bold tracking-tight text-white">{players.length}</p>
              <p className="text-sm text-text-secondary">
                Resultat filtre{players.length > 1 ? 's' : ''} pour la recherche actuelle.
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-kicker">Top asset</p>
              {highestValuePlayer ? (
                <PlayerLink
                  playerId={highestValuePlayer.id}
                  className="font-display text-2xl font-bold tracking-tight text-white"
                >
                  {highestValuePlayer.displayName}
                </PlayerLink>
              ) : (
                <p className="font-display text-2xl font-bold tracking-tight text-white">N/A</p>
              )}
              <p className="text-sm text-text-secondary">
                {highestValuePlayer
                  ? `${highestValuePlayer.teamName} / ${formatCurrency(highestValuePlayer.marketValue)}`
                  : 'Aucun joueur disponible'}
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-kicker">Valeur moyenne</p>
              <p className="font-display text-2xl font-bold tracking-tight text-white">
                {formatCurrency(averagePlayerMarketValue)}
              </p>
              <p className="text-sm text-text-secondary">
                Benchmark rapide pour les comparaisons de roster.
              </p>
            </Card>
          </>
        ) : (
          <>
            <Card className="space-y-2">
              <p className="text-kicker">Equipes classees</p>
              <p className="font-display text-2xl font-bold tracking-tight text-white">{teams.length}</p>
              <p className="text-sm text-text-secondary">
                Clubs tries par valeur marchande totale du roster.
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-kicker">Top collectif</p>
              <p className="font-display text-2xl font-bold tracking-tight text-white">{topTeam?.name ?? 'N/A'}</p>
              <p className="text-sm text-text-secondary">
                {topTeam
                  ? `${topTeam.shortCode} / ${formatCurrency(topTeam.totalMarketValue)}`
                  : 'Aucune equipe disponible'}
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-kicker">Valeur moyenne club</p>
              <p className="font-display text-2xl font-bold tracking-tight text-white">
                {formatCurrency(averageTeamMarketValue)}
              </p>
              <p className="text-sm text-text-secondary">
                Moyenne globale sur les effectifs actifs.
              </p>
            </Card>
          </>
        )}
      </section>

      {view === 'players' && players.length >= 3 && sort === 'marketValue-desc' ? (
        <TopPlayersShowcase players={players} />
      ) : null}

      {view === 'players' && players.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(players.length >= 3 && sort === 'marketValue-desc' ? players.slice(3) : players).map(
            (player) => (
              <PlayerCard key={player.id} player={player} />
            ),
          )}
        </div>
      ) : null}

      {view === 'teams' && teams.length > 0 ? <TeamMarketValueRanking teams={teams} /> : null}

      {(view === 'players' && players.length === 0) || (view === 'teams' && teams.length === 0) ? (
        <Card className="space-y-3">
          <p className="text-kicker">Aucun resultat</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            {view === 'players'
              ? 'Aucun joueur ne correspond aux filtres actuels'
              : 'Aucune equipe disponible pour le moment'}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary">
            {view === 'players'
              ? 'Change la recherche, le role ou reinitialise les filtres pour revenir a la vue complete du marche.'
              : 'Le classement des valeurs marchandes equipe apparaitra ici des que des effectifs seront disponibles.'}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
