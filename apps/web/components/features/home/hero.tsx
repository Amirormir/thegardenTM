import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

export function Hero() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <Card elevated className="surface-grid overflow-hidden p-8 md:p-10">
        <p className="text-kicker">Monorepo Ready</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-tight text-white md:text-6xl">
          L’univers premium pour piloter une ligue League of Legends comme un vrai{' '}
          <span className="gradient-text">transfermarket esports</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
          Nexus League centralise valorisation des joueurs, contrats, calendrier, standings et
          statistiques Riot dans une seule plateforme fullstack prête à évoluer.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/transfermarket" className={buttonVariants({ size: 'lg' })}>
            Explorer le marché
          </Link>
          <Link
            href="/league"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Voir le classement
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Players tracked"
            value="20"
            icon="shield"
            trend={{ direction: 'up', value: '+4 this split' }}
          />
          <StatCard
            label="Matches synced"
            value="18"
            icon="swords"
            trend={{ direction: 'up', value: '+6 this week' }}
          />
          <StatCard
            label="Market volume"
            value="16.5M"
            icon="coins"
            trend={{ direction: 'up', value: '+12%' }}
          />
        </div>
      </Card>

      <Card className="flex flex-col justify-between p-7">
        <div>
          <p className="text-kicker">Current split</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white">Spring 2026</h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            Tableau de bord orienté performance, pilotage d’effectif et audit trail admin.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400/12 p-3 text-amber-300">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                  Premium insight
                </p>
                <p className="font-semibold text-white">Void Sentinels dominent actuellement.</p>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-accent-primary/16 bg-accent-primary/8 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-glow">Focus player</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">ZeroPulse</p>
            <p className="mt-1 text-sm text-text-secondary">
              Mid laner valorisé à 980 000, leader KDA sur les trois dernières semaines.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
