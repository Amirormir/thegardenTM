import Link from 'next/link';
import { ArrowDown, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { TeamTintCard } from '@/components/ui/team-tint';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface HeroTopPlayer {
  id: string;
  displayName: string;
  role: string;
  marketValue: number;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl: string | null;
}

interface HeroProps {
  completedMatchCount: number;
  playerCount: number;
  seasonName: string | null;
  teamCount: number;
  topPlayers: HeroTopPlayer[];
  topTeam: { name: string; points: number; shortCode: string } | null;
  totalMarketValue: number;
}

const rankStyles = [
  'border-amber-300/40 bg-amber-300/14 text-amber-200',
  'border-slate-300/30 bg-slate-200/10 text-slate-100',
  'border-orange-300/30 bg-orange-300/10 text-orange-200',
];

function HeroMetric({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-xl">
      <p className="text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">{label}</p>
      <p className="mt-3 truncate font-display text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm text-text-secondary">{helper}</p>
    </div>
  );
}

export function Hero({
  completedMatchCount,
  playerCount,
  seasonName,
  teamCount,
  topPlayers,
  topTeam,
  totalMarketValue,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c13] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.36)] md:px-8 md:py-10 xl:px-10 xl:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(56,189,248,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <div>
          <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 backdrop-blur-xl">
            <span>{seasonName ?? 'Split en cours'}</span>
            {topTeam ? (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>
                  {topTeam.name} en tete ({topTeam.points} pts)
                </span>
              </>
            ) : null}
          </div>

          <h1 className="mt-6 max-w-3xl font-display text-4xl font-black leading-[1.02] text-white md:text-6xl">
            La ligue et le transfermarket, reunis dans une home beaucoup plus directe.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
            En haut, on voit tout de suite les plus grosses valeurs du marche. Juste apres, le
            classement et les derniers resultats donnent le vrai rythme du split.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/transfermarket" className={buttonVariants({ size: 'lg' })}>
              Explorer le transfermarket
            </Link>
            <Link
              href="#home-overview"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              <ArrowDown className="h-4 w-4" />
              Voir le classement
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Equipes"
              value={teamCount.toString()}
              helper={
                topTeam ? `${topTeam.shortCode} mene actuellement le split.` : 'Classement en attente.'
              }
            />
            <HeroMetric
              label="Joueurs suivis"
              value={playerCount.toString()}
              helper={`${Math.min(topPlayers.length, 3)} top valeurs mises en avant.`}
            />
            <HeroMetric
              label="Valeur totale"
              value={formatCurrency(totalMarketValue)}
              helper={`${completedMatchCount} resultats deja enregistres.`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-kicker">Top 3 valeurs</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">
                  Les gros noms du moment
                </h2>
              </div>
              <div className="rounded-2xl border border-amber-300/18 bg-amber-300/10 p-3 text-amber-200">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Les trois plus grosses valeurs marchandes sont visibles des l&apos;arrivee sur la
              page.
            </p>
          </div>

          {topPlayers.length > 0 ? (
            topPlayers.slice(0, 3).map((player, index) => (
              <TeamTintCard
                key={player.id}
                logoUrl={player.teamLogoUrl}
                className="p-0"
                contentClassName="flex items-center gap-4 p-4"
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black',
                    rankStyles[index] ?? 'border-white/15 bg-white/8 text-white',
                  )}
                >
                  #{index + 1}
                </div>

                <TeamAvatar
                  name={player.teamName}
                  shortCode={player.teamShortCode}
                  logoUrl={player.teamLogoUrl}
                  size="md"
                  className="shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <PlayerLink
                    playerId={player.id}
                    className="block truncate font-display text-xl font-bold text-white"
                  >
                    {player.displayName}
                  </PlayerLink>
                  <p className="mt-1 truncate text-sm text-white/78">
                    {player.teamName} / {player.role}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[0.72rem] uppercase tracking-[0.18em] text-white/55">
                    Valeur
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {formatCurrency(player.marketValue)}
                  </p>
                </div>
              </TeamTintCard>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 text-sm text-text-secondary backdrop-blur-xl">
              Les top valeurs apparaitront ici des que les joueurs seront disponibles.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
