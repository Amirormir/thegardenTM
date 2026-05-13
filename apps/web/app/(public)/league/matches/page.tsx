import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function MatchesPage() {
  const caller = await getServerCaller();
  const allMatches = await caller.match.getAll();

  const completed = allMatches.filter((m) => m.isCompleted);
  const upcoming = allMatches.filter((m) => !m.isCompleted);

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 06 · Matchs</p>
        <h1 className="mt-4 display-lg text-foreground">Calendrier &amp; résultats.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Vue complète des rencontres avec scores issus de la base de données.
          Filtrez par saison via l&apos;onglet historique pour remonter le temps.
        </p>
      </header>

      {allMatches.length === 0 ? (
        <section className="border-y border-hairline py-12">
          <p className="label-mono">Aucun match</p>
          <h2 className="mt-3 display-md text-foreground">Le calendrier est vide.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground-dim">
            Aucune rencontre n&apos;a encore été programmée par l&apos;admin.
          </p>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <p className="label-mono">§ Résultats</p>
          <h2 className="mt-3 display-md text-foreground">
            {completed.length.toString().padStart(2, '0')} match
            {completed.length > 1 ? 's' : ''} joué{completed.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {completed.map((match, i) => (
              <FightMatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <p className="label-mono">§ À venir</p>
          <h2 className="mt-3 display-md text-foreground">
            {upcoming.length.toString().padStart(2, '0')} match
            {upcoming.length > 1 ? 's' : ''} programmé{upcoming.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {upcoming.map((match, i) => (
              <FightMatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
