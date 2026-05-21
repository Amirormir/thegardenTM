import Link from 'next/link';
import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { cn } from '@/lib/utils/cn';
import { getPublicCaller } from '@/server/public/caller';

export const revalidate = 60;

interface HistoriquePageProps {
  searchParams: Promise<{
    season?: string | string[];
  }>;
}

export default async function HistoriquePage({ searchParams }: HistoriquePageProps) {
  const params = await searchParams;
  const selectedSeasonId = typeof params.season === 'string' ? params.season : undefined;
  const caller = await getPublicCaller();

  const seasons = await caller.league.getAllSeasons();
  const currentSeason = seasons.find((s) => s.isCurrent);
  const activeSeasonId = selectedSeasonId ?? currentSeason?.id;
  const activeSeasonName = seasons.find((s) => s.id === activeSeasonId)?.name ?? 'Saison courante';

  const matches = activeSeasonId
    ? await caller.league.getSchedule({ seasonId: activeSeasonId })
    : [];

  const completedMatches = matches.filter((m) => m.isCompleted);
  const upcomingMatches = matches.filter((m) => !m.isCompleted);

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 04 · Historique</p>
        <h1 className="mt-4 display-lg text-foreground">Résultats &amp; calendrier.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Toutes les rencontres consignées saison après saison. Sélectionnez une édition
          pour basculer sur ses matchs joués et à venir.
        </p>

        <nav
          aria-label="Saisons"
          className="mt-8 flex flex-wrap items-center gap-6 border-b border-hairline"
        >
          {seasons.map((season) => {
            const active = season.id === activeSeasonId;
            return (
              <Link
                key={season.id}
                href={`/league/historique?season=${season.id}`}
                className={cn(
                  'relative whitespace-nowrap pb-3 text-sm transition-colors duration-150',
                  active ? 'text-foreground' : 'text-foreground-dim hover:text-foreground',
                )}
              >
                {season.name}
                {season.isCurrent ? (
                  <span className="ml-2 label-mono">(courante)</span>
                ) : null}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-px bg-accent"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      {completedMatches.length > 0 ? (
        <section>
          <p className="label-mono">§ Résultats · {activeSeasonName}</p>
          <h2 className="mt-3 display-md text-foreground">
            {completedMatches.length.toString().padStart(2, '0')} match
            {completedMatches.length > 1 ? 's' : ''} joué{completedMatches.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {completedMatches.map((match) => (
              <FightMatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {upcomingMatches.length > 0 ? (
        <section>
          <p className="label-mono">§ À venir · {activeSeasonName}</p>
          <h2 className="mt-3 display-md text-foreground">
            {upcomingMatches.length.toString().padStart(2, '0')} match
            {upcomingMatches.length > 1 ? 's' : ''} programmé{upcomingMatches.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {upcomingMatches.map((match) => (
              <FightMatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {completedMatches.length === 0 && upcomingMatches.length === 0 ? (
        <section className="border-y border-hairline py-12">
          <p className="label-mono">Aucun match</p>
          <h2 className="mt-3 display-md text-foreground">
            Aucune rencontre enregistrée pour {activeSeasonName}.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground-dim">
            Les matchs apparaîtront ici une fois qu&apos;ils auront été programmés par
            l&apos;admin.
          </p>
        </section>
      ) : null}
    </div>
  );
}
