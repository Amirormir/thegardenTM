import { MatchCard } from '@/components/features/league/match-card';
import { StandingsTable } from '@/components/features/league/standings-table';
import { Card } from '@/components/ui/card';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function LeaguePage() {
  const caller = await getServerCaller();
  const [standings, allMatches] = await Promise.all([
    caller.league.getStandings(),
    caller.match.getAll(),
  ]);

  const recentMatches = allMatches.slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Classement</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Vue publique du split courant avec standings, rythme de compétition et aperçu du
          calendrier.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-0">
          <div className="border-b border-white/[0.05] px-6 py-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">Standings</h2>
          </div>
          <div className="p-4">
            <StandingsTable standings={standings} />
          </div>
        </Card>

        <div className="space-y-4">
          {recentMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
