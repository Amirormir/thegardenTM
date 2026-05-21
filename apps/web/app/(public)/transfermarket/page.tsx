import Link from 'next/link';
import { CostFilters } from '@/components/features/transfermarket/cost-filters';
import { CostTierGrid } from '@/components/features/transfermarket/cost-tier-grid';
import { MarketFilters } from '@/components/features/transfermarket/market-filters';
import { PlayerCard } from '@/components/features/transfermarket/player-card';
import { TeamMarketValueRanking } from '@/components/features/transfermarket/team-market-value-ranking';
import { TopPlayersShowcase } from '@/components/features/transfermarket/top-players-showcase';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamInline } from '@/components/ui/team-inline';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { getPublicCaller } from '@/server/public/caller';

export const revalidate = 60;

interface TransfermarketPageProps {
  searchParams: Promise<{
    q?: string | string[];
    role?: string | string[];
    sort?: string | string[];
    view?: string | string[];
    page?: string | string[];
  }>;
}

const PLAYERS_PAGE_SIZE = 30;

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
type TransferView = 'players' | 'teams' | 'cost';

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
  if (value === 'teams') return 'teams';
  if (value === 'cost') return 'cost';
  return 'players';
}

function getPageValue(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

function buildTransfermarketHref(options: {
  view: TransferView;
  search?: string | undefined;
  role?: RoleValue | undefined;
  sort?: SortValue | undefined;
  page?: number | undefined;
}) {
  const query = new URLSearchParams();

  if (options.view === 'teams' || options.view === 'cost') {
    query.set('view', options.view);
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

  if (options.page && options.page > 1) {
    query.set('page', String(options.page));
  }

  const serialized = query.toString();
  return serialized ? `/transfermarket?${serialized}` : '/transfermarket';
}

function ViewTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative pb-3 text-sm transition-colors duration-150',
        active ? 'text-foreground' : 'text-foreground-dim hover:text-foreground',
      )}
    >
      {label}
      {active ? (
        <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px bg-accent" />
      ) : null}
    </Link>
  );
}

function KpiBlock({
  helper,
  label,
  value,
}: {
  helper: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-t border-hairline pt-5">
      <p className="label-mono">{label}</p>
      <div className="mt-3 display-md text-foreground tabular-nums">{value}</div>
      <div className="mt-2 text-sm leading-6 text-foreground-dim">{helper}</div>
    </div>
  );
}

export default async function TransfermarketPage({ searchParams }: TransfermarketPageProps) {
  const params = await searchParams;
  const search = getSearchValue(params.q);
  const role = getRoleValue(getSearchValue(params.role));
  const sort = getSortValue(getSearchValue(params.sort));
  const view = getViewValue(getSearchValue(params.view));
  const requestedPage = getPageValue(getSearchValue(params.page));
  const caller = await getPublicCaller();

  const playersPage =
    view === 'players'
      ? await caller.player.getListPaged({
          ...(search ? { search } : {}),
          ...(role ? { role } : {}),
          sort,
          page: requestedPage,
          pageSize: PLAYERS_PAGE_SIZE,
        })
      : null;
  const players = playersPage?.items ?? [];
  const playersTotal = playersPage?.total ?? 0;
  const currentPage = playersPage?.page ?? 1;
  const pageCount = playersPage?.pageCount ?? 1;
  const costPlayers =
    view === 'cost'
      ? await caller.player.getAll({
          ...(role ? { role } : {}),
          limit: 200,
          sort: 'marketValue-desc',
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
  const costViewHref = buildTransfermarketHref({
    view: 'cost',
    role,
  });

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 02 · Le marché</p>
        <h1 className="mt-4 display-lg text-foreground">
          {view === 'players'
            ? 'Liste des joueurs.'
            : view === 'cost'
              ? 'Joueurs par cost.'
              : 'Classement des équipes.'}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          {view === 'players'
            ? 'Les meilleures valeurs du marché, les profils à suivre et les comparaisons utiles pour lire la fenêtre en un coup d’œil.'
            : view === 'cost'
              ? 'Tous les joueurs regroupés par leur cost (1 à 5). Filtre par rôle principal pour cibler les profils.'
              : 'Lecture simple de la valeur marchande totale de chaque effectif, accentuée par la couleur dominante du logo.'}
        </p>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <nav
            aria-label="Mode de consultation"
            className="flex items-center gap-6 border-b border-hairline"
          >
            <ViewTab active={view === 'players'} href={playersViewHref} label="Joueurs" />
            <ViewTab active={view === 'cost'} href={costViewHref} label="Cost" />
            <ViewTab active={view === 'teams'} href={teamsViewHref} label="Équipes" />
          </nav>

          {view === 'players' ? (
            <Link
              href="/transfermarket/comparison"
              className="self-start label-mono text-foreground-dim transition-colors duration-150 hover:text-accent lg:self-end"
            >
              Comparer des joueurs →
            </Link>
          ) : null}
        </div>

        {view === 'players' ? (
          <div className="mt-6">
            <MarketFilters search={search} role={role ?? 'all'} sort={sort} />
          </div>
        ) : null}

        {view === 'cost' ? (
          <div className="mt-6">
            <CostFilters role={role ?? 'all'} />
          </div>
        ) : null}
      </header>

      {view === 'cost' ? null : (
      <section className="grid gap-10 md:grid-cols-3 md:gap-12">
        {view === 'players' ? (
          <>
            <KpiBlock
              label="Actifs filtrés"
              value={playersTotal.toString().padStart(2, '0')}
              helper={`Résultat${playersTotal > 1 ? 's' : ''} pour la recherche actuelle.`}
            />
            <KpiBlock
              label="Top asset"
              value={
                highestValuePlayer ? (
                  <PlayerLink playerId={highestValuePlayer.id} className="text-foreground">
                    {highestValuePlayer.displayName}
                  </PlayerLink>
                ) : (
                  'N/A'
                )
              }
              helper={
                highestValuePlayer ? (
                  <TeamInline
                    name={highestValuePlayer.teamName}
                    shortCode={highestValuePlayer.teamShortCode}
                    logoUrl={highestValuePlayer.teamLogoUrl}
                    size="xs"
                    text={`${highestValuePlayer.teamShortCode} · ${formatCurrency(highestValuePlayer.marketValue)}`}
                  />
                ) : (
                  'Aucun joueur disponible.'
                )
              }
            />
            <KpiBlock
              label="Valeur moyenne"
              value={formatCurrency(averagePlayerMarketValue)}
              helper="Benchmark rapide pour les comparaisons de roster."
            />
          </>
        ) : (
          <>
            <KpiBlock
              label="Équipes classées"
              value={teams.length.toString().padStart(2, '0')}
              helper="Clubs triés par valeur marchande totale du roster."
            />
            <KpiBlock
              label="Top collectif"
              value={topTeam?.name ?? 'N/A'}
              helper={
                topTeam ? (
                  <TeamInline
                    name={topTeam.name}
                    shortCode={topTeam.shortCode}
                    logoUrl={topTeam.logoUrl}
                    size="xs"
                    text={`${topTeam.shortCode} · ${formatCurrency(topTeam.totalMarketValue)}`}
                  />
                ) : (
                  'Aucune équipe disponible.'
                )
              }
            />
            <KpiBlock
              label="Valeur moyenne club"
              value={formatCurrency(averageTeamMarketValue)}
              helper="Moyenne globale sur les effectifs actifs."
            />
          </>
        )}
      </section>
      )}

      {view === 'cost' ? (
        <section>
          <p className="label-mono">Cost tiers</p>
          <h2 className="mt-3 display-md text-foreground">
            {costPlayers.length.toString().padStart(2, '0')} joueur
            {costPlayers.length > 1 ? 's' : ''} listé{costPlayers.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8">
            <CostTierGrid players={costPlayers} />
          </div>
        </section>
      ) : null}

      {view === 'players' &&
      currentPage === 1 &&
      players.length >= 3 &&
      sort === 'marketValue-desc' ? (
        <section>
          <p className="label-mono">Podium du marché</p>
          <h2 className="mt-3 display-md text-foreground">Les trois plus grosses cotes.</h2>
          <div className="mt-8">
            <TopPlayersShowcase players={players} />
          </div>
        </section>
      ) : null}

      {view === 'players' && players.length > 0 ? (
        <section>
          <p className="label-mono">
            {currentPage === 1 && players.length >= 3 && sort === 'marketValue-desc'
              ? 'Reste du marché'
              : 'Marché'}
          </p>
          <h2 className="mt-3 display-md text-foreground">
            {playersTotal.toString().padStart(2, '0')} joueur{playersTotal > 1 ? 's' : ''}{' '}
            suivi{playersTotal > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8 grid gap-px border-t border-hairline bg-hairline md:grid-cols-2 xl:grid-cols-3">
            {(currentPage === 1 && players.length >= 3 && sort === 'marketValue-desc'
              ? players.slice(3)
              : players
            ).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
          {pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-10 flex items-center justify-between border-t border-hairline pt-6"
            >
              <p className="label-mono text-foreground-muted">
                Page {currentPage.toString().padStart(2, '0')} / {pageCount.toString().padStart(2, '0')}
              </p>
              <div className="flex items-center gap-3">
                {currentPage > 1 ? (
                  <Link
                    href={buildTransfermarketHref({
                      view: 'players',
                      search,
                      role,
                      sort,
                      page: currentPage - 1,
                    })}
                    className="border border-hairline bg-surface px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-surface-hover"
                  >
                    ← Précédent
                  </Link>
                ) : (
                  <span className="border border-hairline bg-surface px-4 py-2 text-sm text-foreground-muted opacity-50">
                    ← Précédent
                  </span>
                )}
                {currentPage < pageCount ? (
                  <Link
                    href={buildTransfermarketHref({
                      view: 'players',
                      search,
                      role,
                      sort,
                      page: currentPage + 1,
                    })}
                    className="border border-hairline bg-surface px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-surface-hover"
                  >
                    Suivant →
                  </Link>
                ) : (
                  <span className="border border-hairline bg-surface px-4 py-2 text-sm text-foreground-muted opacity-50">
                    Suivant →
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </section>
      ) : null}

      {view === 'teams' && teams.length > 0 ? (
        <section>
          <p className="label-mono">Classement</p>
          <h2 className="mt-3 display-md text-foreground">
            {teams.length.toString().padStart(2, '0')} effectif{teams.length > 1 ? 's' : ''}{' '}
            évalué{teams.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8">
            <TeamMarketValueRanking teams={teams} />
          </div>
        </section>
      ) : null}

      {(view === 'players' && players.length === 0) ||
      (view === 'teams' && teams.length === 0) ||
      (view === 'cost' && costPlayers.length === 0) ? (
        <section className="border-y border-hairline py-12">
          <p className="label-mono">Aucun résultat</p>
          <h2 className="mt-3 display-md text-foreground">
            {view === 'players'
              ? 'Aucun joueur ne correspond aux filtres actuels.'
              : view === 'cost'
                ? 'Aucun joueur pour ce rôle.'
                : 'Aucune équipe disponible pour le moment.'}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground-dim">
            {view === 'players'
              ? 'Change la recherche, le rôle ou réinitialise les filtres pour revenir à la vue complète du marché.'
              : view === 'cost'
                ? 'Change ou réinitialise le filtre de rôle pour voir d’autres paliers.'
                : 'Le classement des valeurs marchandes équipe apparaîtra ici dès que des effectifs seront disponibles.'}
          </p>
        </section>
      ) : null}
    </div>
  );
}
