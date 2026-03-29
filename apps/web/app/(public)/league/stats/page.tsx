import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function LeagueStatsPage() {
  const caller = await getServerCaller();
  const leaders = await caller.stats.getLeagueLeaders();

  const topKda = leaders.kdaLeader[0];
  const topCs = leaders.csLeader[0];
  const topDmg = leaders.damageLeader[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League stats</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Stats de la ligue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Statistiques agrégées depuis les données de matchs enregistrés.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Top KDA"
          value={topKda ? topKda.kda.toFixed(1) : '-'}
          icon="swords"
          trend={{ direction: 'up', value: topKda?.gameName ?? '' }}
        />
        <StatCard
          label="Top CS/game"
          value={topCs ? topCs.avgCs.toFixed(0) : '-'}
          icon="bar-chart"
          trend={{ direction: 'up', value: topCs?.gameName ?? '' }}
        />
        <StatCard
          label="Top Damage/game"
          value={topDmg ? topDmg.avgDamage.toFixed(0) : '-'}
          icon="crosshair"
          trend={{ direction: 'up', value: topDmg?.gameName ?? '' }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-4">
          <div>
            <p className="text-kicker">KDA Leaders</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Kill / Death / Assist</h2>
          </div>
          <div className="space-y-3">
            {leaders.kdaLeader.map((entry, index) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-secondary">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{entry.gameName}</p>
                    <p className="text-xs text-text-secondary">
                      {entry.teamName} <Badge variant={entry.role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'}>{entry.role}</Badge>
                    </p>
                  </div>
                </div>
                <span className="font-mono text-lg font-semibold text-accent-glow">
                  {entry.kda.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-kicker">CS Leaders</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Creep Score / game</h2>
          </div>
          <div className="space-y-3">
            {leaders.csLeader.map((entry, index) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-secondary">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{entry.gameName}</p>
                    <p className="text-xs text-text-secondary">
                      {entry.teamName} <Badge variant={entry.role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'}>{entry.role}</Badge>
                    </p>
                  </div>
                </div>
                <span className="font-mono text-lg font-semibold text-accent-glow">
                  {entry.avgCs.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-kicker">Damage Leaders</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Damage / game</h2>
          </div>
          <div className="space-y-3">
            {leaders.damageLeader.map((entry, index) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-secondary">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{entry.gameName}</p>
                    <p className="text-xs text-text-secondary">
                      {entry.teamName} <Badge variant={entry.role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'}>{entry.role}</Badge>
                    </p>
                  </div>
                </div>
                <span className="font-mono text-lg font-semibold text-accent-glow">
                  {entry.avgDamage.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
