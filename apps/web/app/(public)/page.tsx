import { MatchCard } from '@/components/features/league/match-card';
import { Hero } from '@/components/features/home/hero';
import { QuickStandings } from '@/components/features/home/quick-standings';
import { Card } from '@/components/ui/card';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function HomePage() {
  const caller = await getServerCaller();
  const [standings, allMatches, season, leaders] = await Promise.all([
    caller.league.getStandings(),
    caller.match.getAll(),
    caller.league.getCurrentSeason(),
    caller.stats.getLeagueLeaders(),
  ]);

  const playerCount = new Set(
    leaders.kdaLeader.concat(leaders.csLeader, leaders.damageLeader).map((entry) => entry.playerId),
  ).size;

  const totalMarketValue = leaders.kdaLeader.reduce(() => 0, 0);

  const topTeam = standings[0]?.name ?? null;
  const kdaTop = leaders.kdaLeader[0] ?? null;
  const topPlayer = kdaTop
    ? { gameName: kdaTop.gameName, role: kdaTop.role, marketValue: 0 }
    : null;

  const topPlayerWithValue = topPlayer
    ? await (async () => {
        try {
          const stats = await caller.stats.getPlayerStats({ playerId: kdaTop!.playerId });
          return { ...topPlayer, marketValue: 0, kda: stats.summary.avgKills + stats.summary.avgAssists };
        } catch {
          return topPlayer;
        }
      })()
    : null;

  const featuredMatches = allMatches.slice(0, 3);

  const leaderEntries = [
    {
      label: 'KDA',
      value: leaders.kdaLeader[0] ? leaders.kdaLeader[0].kda.toFixed(1) : '-',
      player: leaders.kdaLeader[0]?.gameName ?? '-',
      trend: 'up' as const,
    },
    {
      label: 'CS/MIN',
      value: leaders.csLeader[0] ? leaders.csLeader[0].avgCs.toFixed(0) : '-',
      player: leaders.csLeader[0]?.gameName ?? '-',
      trend: 'up' as const,
    },
    {
      label: 'Dmg/min',
      value: leaders.damageLeader[0] ? leaders.damageLeader[0].avgDamage.toFixed(0) : '-',
      player: leaders.damageLeader[0]?.gameName ?? '-',
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-8">
      <Hero
        playerCount={playerCount || allMatches.length}
        matchCount={allMatches.length}
        totalMarketValue={totalMarketValue}
        seasonName={season?.name ?? null}
        topTeam={topTeam}
        topPlayer={topPlayerWithValue}
      />

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <QuickStandings standings={standings} />
        <Card className="space-y-5">
          <div>
            <p className="text-kicker">League leaders</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Form snapshot</h2>
          </div>
          <div className="space-y-3">
            {leaderEntries.map((entry) => (
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
          {featuredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </div>
  );
}
