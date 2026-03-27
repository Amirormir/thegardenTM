import { MatchCard } from '@/components/features/league/match-card';
import { Hero } from '@/components/features/home/hero';
import { QuickStandings } from '@/components/features/home/quick-standings';
import { Card } from '@/components/ui/card';
import { matches, recentLeaders, teams } from '@/lib/utils/mock-data';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Hero />

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <QuickStandings />
        <Card className="space-y-5">
          <div>
            <p className="text-kicker">League leaders</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Form snapshot</h2>
          </div>
          <div className="space-y-3">
            {recentLeaders.map((entry) => (
              <div
                key={entry.label}
                className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                      {entry.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">{entry.value}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{entry.player}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                      {entry.trend === 'up' ? 'Trending up' : 'Under pressure'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-kicker">Upcoming & recent</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Featured matches</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
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
      </section>
    </div>
  );
}
