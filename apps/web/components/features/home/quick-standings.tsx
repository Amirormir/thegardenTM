import { StandingsTable } from '@/components/features/league/standings-table';
import { Card } from '@/components/ui/card';
import { standings } from '@/lib/utils/mock-data';

export function QuickStandings() {
  return (
    <Card className="p-0">
      <div className="border-b border-white/8 px-6 py-5">
        <p className="text-kicker">League snapshot</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-white">Top standings</h2>
      </div>
      <div className="p-4">
        <StandingsTable standings={standings} />
      </div>
    </Card>
  );
}
