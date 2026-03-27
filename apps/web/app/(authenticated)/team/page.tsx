import { StatCard } from '@/components/ui/stat-card';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { players } from '@/lib/utils/mock-data';

export default function TeamDashboardPage() {
  const roster = players.filter((player) => player.teamId === 'team-4');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Protected area</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Dashboard équipe</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Espace capitaine prêt pour les hooks tRPC et les opérations liées à l’effectif.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Roster size"
          value="5"
          icon="users"
          trend={{ direction: 'up', value: 'stable' }}
        />
        <StatCard
          label="Market value"
          value="4.6M"
          icon="coins"
          trend={{ direction: 'up', value: '+2.1%' }}
        />
        <StatCard
          label="Contracts active"
          value="5"
          icon="shield"
          trend={{ direction: 'up', value: '100%' }}
        />
      </div>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Current roster</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Starting five</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Market value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-semibold text-white">{player.gameName}</TableCell>
                <TableCell>{player.role}</TableCell>
                <TableCell>{player.salary.toLocaleString('fr-FR')}</TableCell>
                <TableCell>{player.marketValue.toLocaleString('fr-FR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <BudgetCalculator />
    </div>
  );
}
