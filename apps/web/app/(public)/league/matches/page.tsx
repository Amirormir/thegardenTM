import { MatchCard } from '@/components/features/league/match-card';
import { matches, teams } from '@/lib/utils/mock-data';

export default function MatchesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League matches</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Résultats</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Vue préparée pour accueillir le vrai calendrier tRPC et les scores issus de Riot.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {matches.map((match) => {
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
  );
}
