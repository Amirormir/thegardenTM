import type { TeamStanding } from '@nexus/types';
import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { StandingsStack } from '@/components/features/league/standings-stack';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

function computeRecentForm(
  standings: TeamStanding[],
  matches: { homeTeam: { id: string }; awayTeam: { id: string }; homeScore: number; awayScore: number; isCompleted: boolean }[],
): Record<string, ('W' | 'L')[]> {
  const completed = matches.filter((m) => m.isCompleted);
  const form: Record<string, ('W' | 'L')[]> = {};
  for (const team of standings) {
    form[team.id] = completed
      .filter((m) => m.homeTeam.id === team.id || m.awayTeam.id === team.id)
      .slice(0, 5)
      .map((m) => {
        const isHome = m.homeTeam.id === team.id;
        return (isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore) ? 'W' : 'L';
      });
  }
  return form;
}

export default async function LeaguePage() {
  const caller = await getServerCaller();
  const [standings, recentSource] = await Promise.all([
    caller.league.getStandings(),
    caller.match.getRecent({ limit: 50 }),
  ]);

  const recentForm = computeRecentForm(standings, recentSource);
  const completedMatches = [...recentSource]
    .filter((m) => m.isCompleted)
    .sort(
      (a, b) =>
        new Date(b.playedAt ?? b.scheduledAt).getTime() -
        new Date(a.playedAt ?? a.scheduledAt).getTime(),
    );
  const recentMatches = completedMatches.slice(0, 3);

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 03 · La compétition</p>
        <h1 className="mt-4 display-lg text-foreground">Classement du split.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Vue publique du split courant avec standings, rythme de compétition et aperçu des
          derniers résultats.
        </p>
      </header>

      <section className="grid gap-16 xl:grid-cols-[1.2fr_0.8fr] xl:gap-20">
        <div>
          <p className="label-mono">§ Standings</p>
          <h2 className="mt-3 display-md text-foreground">
            {standings.length.toString().padStart(2, '0')} équipe
            {standings.length > 1 ? 's' : ''} engagée{standings.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8">
            {standings.length > 0 ? (
              <StandingsStack standings={standings} recentForm={recentForm} />
            ) : (
              <div className="border border-hairline bg-surface px-5 py-6">
                <p className="text-sm text-foreground-dim">
                  Aucune donnée de classement pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="label-mono">§ Derniers résultats</p>
          <h2 className="mt-3 display-md text-foreground">À chaud.</h2>
          <div className="mt-8 space-y-5">
            {recentMatches.length > 0 ? (
              recentMatches.map((match, i) => (
                <FightMatchCard key={match.id} match={match} index={i} />
              ))
            ) : (
              <div className="border border-hairline bg-surface px-5 py-6">
                <p className="text-sm text-foreground-dim">
                  Aucun match terminé pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
