import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BudgetCalculator } from '@/components/features/team/budget-calculator';
import { RosterTable } from '@/components/features/team/roster-table';
import { TransferOffers } from '@/components/features/team/transfer-offers';
import { buttonVariants } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

interface KpiBlockProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiBlock({ label, value, hint }: KpiBlockProps) {
  return (
    <div className="border-l border-hairline pl-5 first:border-l-0 first:pl-0">
      <p className="label-mono">{label}</p>
      <p className="mt-3 font-display text-3xl tabular-nums text-foreground md:text-4xl">{value}</p>
      {hint ? <p className="mt-2 label-mono text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

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
  const budgetUsagePct = Math.round((totalSalary / team.budget) * 100);
  const budgetRemaining = team.budget - totalSalary;

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Dashboard</p>
        <h1 className="mt-4 display-lg text-foreground">{team.name}.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Dashboard de gestion d&apos;effectif et simulation budgétaire.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-8 border-y border-hairline py-8 md:grid-cols-3 md:gap-12">
        <KpiBlock label="Roster" value={team.players.length.toString().padStart(2, '0')} hint="joueurs actifs" />
        <KpiBlock label="Market value" value={formatCurrency(totalMarketValue)} hint="total effectif" />
        <KpiBlock
          label="Budget restant"
          value={formatCurrency(budgetRemaining)}
          hint={`${budgetUsagePct}% utilisé`}
        />
      </section>

      <section>
        <p className="label-mono">§ 01 Effectif</p>
        <h2 className="mt-3 display-md text-foreground">Starting five.</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
          Modifiez le rôle équipe de chaque joueur. Le rôle originel reste visible sur sa fiche
          publique.
        </p>
        <div className="mt-8 border-t border-hairline">
          <RosterTable
            players={team.players.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              role: p.role,
              teamRole: p.teamRole,
              salary: p.salary,
              marketValue: p.marketValue,
            }))}
            teamId={teamId}
          />
        </div>
      </section>

      <section className="flex flex-col gap-6 border-y border-hairline py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="label-mono">§ 02 Contrats</p>
          <h2 className="mt-3 display-md text-foreground">Espace contrats.</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
            Les prolongations, ruptures et nouvelles propositions ont leur page dédiée.
          </p>
        </div>
        <Link
          href="/team/contracts"
          className={cn(buttonVariants({ variant: 'secondary' }), 'self-start md:self-center')}
        >
          Ouvrir les contrats
        </Link>
      </section>

      <section>
        <p className="label-mono">§ 03 Marché</p>
        <h2 className="mt-3 display-md text-foreground">Offres de transfert.</h2>
        <div className="mt-8">
          <TransferOffers teamId={teamId} />
        </div>
      </section>

      <section>
        <p className="label-mono">§ 04 Budget</p>
        <h2 className="mt-3 display-md text-foreground">Simulateur budgétaire.</h2>
        <div className="mt-8">
          <BudgetCalculator
            budget={team.budget}
            players={team.players.map((player) => ({ role: player.role, salary: player.salary }))}
          />
        </div>
      </section>
    </div>
  );
}
