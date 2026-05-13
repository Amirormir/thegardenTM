import { AdminLeagueManager } from '@/components/features/admin/admin-league-manager';
import { StandingsTable } from '@/components/features/league/standings-table';
import { getServerCaller } from '@/server/caller';

export default async function AdminLeaguePage() {
  const caller = await getServerCaller();
  const standings = await caller.league.getStandings();

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Ligue</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion ligue.</h1>
      </header>

      <section>
        <p className="label-mono">§ 01 Classement</p>
        <h2 className="mt-3 display-md text-foreground">Standings actuels.</h2>
        <div className="mt-8 border-t border-hairline">
          {standings.length > 0 ? (
            <StandingsTable standings={standings} />
          ) : (
            <p className="py-6 text-sm text-foreground-dim">Aucune donnée de classement.</p>
          )}
        </div>
      </section>

      <AdminLeagueManager />
    </div>
  );
}
