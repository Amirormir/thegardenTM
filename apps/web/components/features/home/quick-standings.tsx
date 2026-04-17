import type { TeamStanding } from '@nexus/types';
import { StandingsTable } from '@/components/features/league/standings-table';
import { Card } from '@/components/ui/card';

interface QuickStandingsProps {
  standings: TeamStanding[];
}

export function QuickStandings({ standings }: QuickStandingsProps) {
  return (
    <Card className="p-0">
      <div className="border-b border-white/[0.05] px-6 py-5">
        <p className="text-kicker">League snapshot</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Top standings</h2>
      </div>
      <div className="p-4">
        {standings.length > 0 ? (
          <StandingsTable standings={standings} />
        ) : (
          <p className="px-2 py-4 text-sm text-text-secondary">Aucune donnée de classement.</p>
        )}
      </div>
    </Card>
  );
}
