import { AdminLeagueManager } from '@/components/features/admin/admin-league-manager';
import { StandingsTable } from '@/components/features/league/standings-table';
import { Card } from '@/components/ui/card';
import { getServerCaller } from '@/server/caller';

export default async function AdminLeaguePage() {
  const caller = await getServerCaller();
  const standings = await caller.league.getStandings();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Gestion ligue</h1>
      </div>

      <Card className="p-0">
        <div className="border-b border-white/[0.05] px-6 py-5">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Standings</h2>
        </div>
        <div className="p-4">
          {standings.length > 0 ? (
            <StandingsTable standings={standings} />
          ) : (
            <p className="px-2 py-4 text-sm text-text-secondary">Aucune donnée de classement.</p>
          )}
        </div>
      </Card>

      <AdminLeagueManager />
    </div>
  );
}
