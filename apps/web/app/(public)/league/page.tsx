import type { TeamStanding } from '@nexus/types';
import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { StandingsStack } from '@/components/features/league/standings-stack';
import { Card } from '@/components/ui/card';
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
  const [standings, allMatches] = await Promise.all([
    caller.league.getStandings(),
    caller.match.getAll(),
  ]);

  const recentForm = computeRecentForm(standings, allMatches);
  const completedMatches = [...allMatches]
    .filter((m) => m.isCompleted)
    .sort(
      (a, b) =>
        new Date(b.playedAt ?? b.scheduledAt).getTime() -
        new Date(a.playedAt ?? a.scheduledAt).getTime(),
    );
  const recentMatches = completedMatches.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Classement</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Vue publique du split courant avec standings, rythme de competition et apercu du
          calendrier.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          {standings.length > 0 ? (
            <StandingsStack standings={standings} recentForm={recentForm} />
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">
                Aucune donnee de classement pour le moment.
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {recentMatches.length > 0 ? (
            recentMatches.map((match, i) => (
              <FightMatchCard key={match.id} match={match} index={i} />
            ))
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">
                Aucun match termine pour le moment.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
