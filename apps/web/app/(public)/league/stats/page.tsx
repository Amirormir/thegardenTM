import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { recentLeaders } from '@/lib/utils/mock-data';

export default function LeagueStatsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League stats</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Stats de la ligue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Espace prêt pour les agrégations tRPC et l’import Riot mis en cache.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avg game time"
          value="31m 24s"
          icon="bar-chart"
          trend={{ direction: 'down', value: '-2m' }}
        />
        <StatCard
          label="Avg kills"
          value="28.2"
          icon="swords"
          trend={{ direction: 'up', value: '+3.4' }}
        />
        <StatCard
          label="Avg gold"
          value="62.4k"
          icon="coins"
          trend={{ direction: 'up', value: '+5%' }}
        />
        <StatCard
          label="Avg damage"
          value="74.1k"
          icon="crosshair"
          trend={{ direction: 'up', value: '+7%' }}
        />
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-kicker">Leaders board</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Highlights</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {recentLeaders.map((entry) => (
            <div
              key={entry.label}
              className="rounded-[24px] border border-white/10 bg-white/5 p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                {entry.label}
              </p>
              <p className="mt-3 font-display text-4xl font-bold text-white">{entry.value}</p>
              <p className="mt-2 text-sm text-text-secondary">{entry.player}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
