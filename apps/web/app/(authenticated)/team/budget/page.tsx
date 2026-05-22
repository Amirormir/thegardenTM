import { redirect } from 'next/navigation';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { BudgetSlider } from '@/components/features/team/budget-slider';
import { PayrollProjection } from '@/components/features/team/payroll-projection';
import { TeamTabs } from '@/components/features/team/team-tabs';
import { TeamAvatar } from '@/components/ui/team-avatar';
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
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="flex flex-col gap-8 border-b border-hairline pb-8">
        <TeamTabs />
        <div className="flex items-center gap-5">
          <TeamAvatar
            name={team.name}
            shortCode={team.shortCode}
            logoUrl={team.logoUrl}
            size="lg"
            className="!h-20 !w-20"
          />
          <div>
            <p className="breadcrumb-mono">§ · Équipe · Budget</p>
            <h1 className="mt-2 display-lg text-foreground">Arbitrage budgétaire — {team.name}.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
              Convertis du transfert en plafond salarial, simule la répartition des salaires.
            </p>
          </div>
        </div>
      </header>

      <section>
        <p className="label-mono">§ 01 Conversion</p>
        <h2 className="mt-3 display-md text-foreground">Budget ↔ salaires.</h2>
        <div className="mt-8">
          <BudgetSlider teamId={teamId} />
        </div>
      </section>

      <section>
        <p className="label-mono">§ 02 Projection</p>
        <h2 className="mt-3 display-md text-foreground">Engagement salarial.</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
          Anticipe l&apos;évolution de ta masse salariale BO par BO, repère les falaises et les
          contrats les plus coûteux.
        </p>
        <div className="mt-8">
          <PayrollProjection teamId={teamId} />
        </div>
      </section>

      <section>
        <p className="label-mono">§ 03 Simulation</p>
        <h2 className="mt-3 display-md text-foreground">Répartition salariale.</h2>
        <div className="mt-8">
          <BudgetCalculator
            budget={team.salaryBudgetCap}
            players={team.players.map((player) => ({ role: player.role, salary: player.salary }))}
          />
        </div>
      </section>
    </div>
  );
}
