import type { TeamStanding } from '@nexus/types';
import { StandingsTable } from '@/components/features/league/standings-table';

interface QuickStandingsProps {
  standings: TeamStanding[];
}

export function QuickStandings({ standings }: QuickStandingsProps) {
  return (
    <section>
      <header className="border-b border-hairline pb-4">
        <p className="label-mono">League snapshot</p>
        <h2 className="mt-2 display-md text-foreground">Top du classement.</h2>
      </header>
      <div className="mt-6">
        {standings.length > 0 ? (
          <StandingsTable standings={standings} />
        ) : (
          <p className="border-y border-hairline py-6 text-sm text-foreground-muted">
            Aucune donnée de classement.
          </p>
        )}
      </div>
    </section>
  );
}
