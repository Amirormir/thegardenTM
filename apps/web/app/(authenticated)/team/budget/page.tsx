import { redirect } from 'next/navigation';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { BudgetSlider } from '@/components/features/team/budget-slider';
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
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Budget</p>
        <h1 className="mt-4 display-lg text-foreground">Calculateur budget — {team.name}.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Simulateur côté client pour la planification budgétaire.
        </p>
      </header>
      <BudgetSlider teamId={teamId} />
      <BudgetCalculator
        budget={team.salaryBudgetCap}
        players={team.players.map((player) => ({ role: player.role, salary: player.salary }))}
      />
    </div>
  );
}
