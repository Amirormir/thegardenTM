import { redirect } from 'next/navigation';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

export default async function TeamBudgetPage() {
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const team = await caller.team.getById({ id: teamId });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Protected area</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
          Calculateur budget — {team.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Simulateur côté client pour la planification budgétaire.
        </p>
      </div>
      <BudgetCalculator
        budget={team.budget}
        players={team.players.map((player) => ({ role: player.role, salary: player.salary }))}
      />
    </div>
  );
}
