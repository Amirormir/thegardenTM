import { MatchCard } from '@/components/features/league/match-card';
import { StandingsTable } from '@/components/features/league/standings-table';
import { Card } from '@/components/ui/card';
import { matches, standings, teams } from '@/lib/utils/mock-data';

export default function LeaguePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Classement</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Vue publique du split courant avec standings, rythme de compétition et aperçu du
          calendrier.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-0">
          <div className="border-b border-white/8 px-6 py-5">
            <h2 className="font-display text-2xl font-bold text-white">Standings</h2>
          </div>
          <div className="p-4">
            <StandingsTable standings={standings} />
          </div>
        </Card>

        <div className="space-y-4">
          {matches.slice(0, 2).map((match) => {
            const homeTeam = teams.find((team) => team.id === match.homeTeamId);
            const awayTeam = teams.find((team) => team.id === match.awayTeamId);

            if (!homeTeam || !awayTeam) {
              return null;
            }

            return (
              <MatchCard
                key={match.id}
                match={match}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
