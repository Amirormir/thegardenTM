import Link from 'next/link';
import { MatchCard } from '@/components/features/league/match-card';
import { StandingsTable } from '@/components/features/league/standings-table';
import { Hero } from '@/components/features/home/hero';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function HomePage() {
  const caller = await getServerCaller();
  const [standings, allMatches, season, players] = await Promise.all([
    caller.league.getStandings(),
    caller.match.getAll(),
    caller.league.getCurrentSeason(),
    caller.player.getAll({ sort: 'marketValue-desc' }),
  ]);

  const topPlayers = players.slice(0, 3);
  const completedMatches = [...allMatches]
    .filter((match) => match.isCompleted)
    .sort(
      (left, right) =>
        new Date(right.playedAt ?? right.scheduledAt).getTime() -
        new Date(left.playedAt ?? left.scheduledAt).getTime(),
    );
  const recentResults = completedMatches.slice(0, 3);
  const totalMarketValue = players.reduce((sum, player) => sum + player.marketValue, 0);
  const topTeam = standings[0]
    ? {
        name: standings[0].name,
        shortCode: standings[0].shortCode,
        points: standings[0].points,
      }
    : null;

  return (
    <div className="space-y-10 md:space-y-12">
      <Hero
        completedMatchCount={completedMatches.length}
        playerCount={players.length}
        seasonName={season?.name ?? null}
        teamCount={standings.length}
        topPlayers={topPlayers}
        topTeam={topTeam}
        totalMarketValue={totalMarketValue}
      />

      <section id="home-overview" className="space-y-6 scroll-mt-28">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-kicker">League overview</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
              Classement et derniers resultats
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              Une lecture immediate du niveau de la ligue: qui mene, qui prend des points et quels
              sont les derniers BO deja conclus.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/league"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              Classement complet
            </Link>
            <Link
              href="/league/matches"
              className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'text-white')}
            >
              Tous les matchs
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="p-0">
            <div className="border-b border-white/8 px-6 py-5">
              <p className="text-kicker">Standings</p>
              <h3 className="mt-2 font-display text-3xl font-bold text-white">
                Le haut du classement
              </h3>
            </div>
            <div className="p-4">
              {standings.length > 0 ? (
                <StandingsTable standings={standings} />
              ) : (
                <p className="px-2 py-4 text-sm text-text-secondary">
                  Aucune donnee de classement pour le moment.
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-xl">
              <p className="text-kicker">Derniers resultats</p>
              <h3 className="mt-2 font-display text-3xl font-bold text-white">
                Les series qui viennent de tomber
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                On garde ici les resultats les plus recents pour que la home raconte tout de suite
                l&apos;etat de la competition.
              </p>
            </div>

            {recentResults.length > 0 ? (
              recentResults.map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <Card className="space-y-3">
                <p className="text-kicker">Aucun resultat</p>
                <h3 className="font-display text-2xl font-bold text-white">
                  Pas encore de match termine
                </h3>
                <p className="text-sm leading-6 text-text-secondary">
                  Les derniers resultats apparaitront ici des que les premieres series seront
                  validees.
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
