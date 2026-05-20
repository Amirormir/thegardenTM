import { LeagueStatsView } from '@/components/features/league/league-stats-view';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function LeagueStatsPage() {
  const caller = await getServerCaller();
  const [seasons, currentSeason] = await Promise.all([
    caller.league.getAllSeasons(),
    caller.league.getCurrentSeason(),
  ]);

  const seasonOptions = seasons.map((s) => ({
    id: s.id,
    name: s.name,
    year: s.year,
    isCurrent: s.isCurrent,
  }));
  const defaultSeasonId = currentSeason?.id ?? seasons[0]?.id ?? null;

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 05 · Statistiques</p>
        <h1 className="mt-4 display-lg text-foreground">Le détail chiffré.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Classements joueurs, équipes et champions calculés à partir des
          drafts (picks, bans, win rate) et des replays parsés (KDA, dommages,
          CS). Filtrez par saison et par rôle pour affiner l&apos;analyse.
        </p>
      </header>

      <LeagueStatsView seasons={seasonOptions} defaultSeasonId={defaultSeasonId} />
    </div>
  );
}
