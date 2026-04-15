import { LeagueStatsView } from '@/components/features/league/league-stats-view';

export const revalidate = 60;

export default function LeagueStatsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League stats</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Statistiques</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Classements joueurs, equipes et champions depuis les donnees de matchs enregistres.
          Filtrez par role pour affiner l&apos;analyse.
        </p>
      </div>

      <LeagueStatsView />
    </div>
  );
}
