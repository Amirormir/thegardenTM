import Link from 'next/link';
import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { StandingsStack } from '@/components/features/league/standings-stack';
import { Hero } from '@/components/features/home/hero';
import { buttonVariants } from '@/components/ui/button';
import { getHomePageSnapshot } from '@/server/public/page-data';

export const revalidate = 60;

export default async function HomePage() {
  const snapshot = await getHomePageSnapshot();

  return (
    <div className="flex flex-col gap-24 md:gap-28">
      <Hero
        completedMatchCount={snapshot.completedMatchCount}
        playerCount={snapshot.playerCount}
        seasonName={snapshot.seasonName}
        teamCount={snapshot.standings.length}
        topPlayers={snapshot.topPlayers}
        topTeam={snapshot.topTeam}
        totalMarketValue={snapshot.totalMarketValue}
        featuredArticle={snapshot.featuredArticle}
      />

      <section id="home-overview" className="scroll-mt-28">
        <header className="flex flex-col gap-6 border-b border-hairline pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="breadcrumb-mono">§ 01 · L&apos;état de la ligue</p>
            <h2 className="mt-3 display-lg text-foreground">
              Classement et résultats récents.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
              Une lecture immédiate du niveau de la ligue : qui mène, qui prend des points,
              et les BO déjà conclus.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/league" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
              Classement complet
            </Link>
            <Link
              href="/league/matches"
              className={buttonVariants({ variant: 'ghost', size: 'md' })}
            >
              Tous les matchs
            </Link>
          </div>
        </header>

        <div className="mt-10 grid gap-12 xl:grid-cols-[1.3fr_0.7fr] xl:gap-14">
          <div>
            <p className="label-mono">Classement</p>
            <h3 className="mt-3 display-md text-foreground">Le haut du tableau.</h3>
            <div className="mt-6">
              {snapshot.standings.length > 0 ? (
                <StandingsStack
                  standings={snapshot.standings}
                  recentForm={snapshot.recentForm}
                />
              ) : (
                <p className="border-y border-hairline py-8 text-sm text-foreground-muted">
                  Aucune donnée de classement pour le moment.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="label-mono">Derniers résultats</p>
            <h3 className="mt-3 display-md text-foreground">Ce qui vient de tomber.</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-foreground-dim">
              Les résultats les plus récents pour que la home raconte tout de suite
              l&apos;état de la compétition.
            </p>

            <div className="mt-6 flex flex-col">
              {snapshot.recentResults.length > 0 ? (
                snapshot.recentResults.map((match, index) => (
                  <FightMatchCard key={match.id} match={match} index={index} />
                ))
              ) : (
                <div className="border-y border-hairline py-8">
                  <p className="label-mono">Aucun résultat</p>
                  <p className="mt-3 display-md text-foreground">
                    Pas encore de match terminé.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground-dim">
                    Les derniers résultats apparaîtront ici dès que les premières séries seront
                    validées.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
