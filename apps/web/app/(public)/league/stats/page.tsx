import { LeagueStatsView } from '@/components/features/league/league-stats-view';

export const revalidate = 60;

export default function LeagueStatsPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 05 · Statistiques</p>
        <h1 className="mt-4 display-lg text-foreground">Le détail chiffré.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Classements joueurs, équipes et champions calculés à partir des stats stockées.
          Filtrez par rôle pour affiner l&apos;analyse.
        </p>
      </header>

      <LeagueStatsView />
    </div>
  );
}
