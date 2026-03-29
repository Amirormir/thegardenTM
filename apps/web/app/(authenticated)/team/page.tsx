import { redirect } from 'next/navigation';
import { StatCard } from '@/components/ui/stat-card';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { ContractManager } from '@/components/features/team/contract-manager';
import { RosterTable } from '@/components/features/team/roster-table';
import { TransferOffers } from '@/components/features/team/transfer-offers';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

export default async function TeamDashboardPage() {
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const team = await caller.team.getById({ id: teamId });

  const totalMarketValue = team.players.reduce((sum, player) => sum + player.marketValue, 0);
  const totalSalary = team.players.reduce((sum, player) => sum + player.salary, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Protected area</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">{team.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Dashboard de gestion d'effectif et simulation budgétaire.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Roster size"
          value={team.players.length.toString()}
          icon="users"
          trend={{ direction: 'up', value: 'actif' }}
        />
        <StatCard
          label="Market value"
          value={formatCurrency(totalMarketValue)}
          icon="coins"
          trend={{ direction: 'up', value: 'total' }}
        />
        <StatCard
          label="Budget restant"
          value={formatCurrency(team.budget - totalSalary)}
          icon="wallet-cards"
          trend={{
            direction: totalSalary <= team.budget ? 'up' : 'down',
            value: `${Math.round((totalSalary / team.budget) * 100)}% utilisé`,
          }}
        />
      </div>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Current roster</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Starting five</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Modifiez le role equipe de chaque joueur. Le role originel reste visible sur sa fiche publique.
          </p>
        </div>
        <RosterTable
          players={team.players.map((p) => ({
            id: p.id,
            gameName: p.gameName,
            role: p.role,
            teamRole: p.teamRole,
            salary: p.salary,
            marketValue: p.marketValue,
          }))}
          teamId={teamId}
        />
      </Card>

      <ContractManager teamId={teamId} />

      <TransferOffers teamId={teamId} />

      <BudgetCalculator
        budget={team.budget}
        players={team.players.map((player) => ({ role: player.role, salary: player.salary }))}
      />
    </div>
  );
}
