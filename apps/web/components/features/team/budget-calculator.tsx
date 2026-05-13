import { BudgetPieChart } from '@/components/features/charts/budget-pie-chart';
import { formatCurrency } from '@/lib/utils/format';

interface BudgetCalculatorProps {
  budget?: number;
  players?: { role: string; salary: number }[];
}

const FALLBACK_BUDGET = 1200000;

export function BudgetCalculator({
  budget = FALLBACK_BUDGET,
  players = [],
}: BudgetCalculatorProps) {
  const safeBudget = budget > 0 ? budget : FALLBACK_BUDGET;
  const roleMap = new Map<string, number>();

  for (const player of players) {
    roleMap.set(player.role, (roleMap.get(player.role) ?? 0) + player.salary);
  }

  const roleBudget = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map((role) => ({
    role,
    value: roleMap.get(role) ?? 0,
  }));

  const total = players.reduce((sum, entry) => sum + entry.salary, 0);
  const remainingBudget = safeBudget - total;
  const budgetUsed = Math.round((total / safeBudget) * 100);
  const pct = Math.min(budgetUsed, 100);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 border-y border-hairline py-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="label-mono">Simulation client</p>
          <h2 className="mt-3 display-md text-foreground">Budget calculator.</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-foreground-dim">
            Répartition des salaires par rôle et utilisation du budget.
          </p>
        </div>
        <div className="border-l border-hairline pl-5">
          <p className="label-mono">Total salaires</p>
          <p className="mt-3 font-display text-3xl tabular-nums text-foreground md:text-4xl">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between label-mono">
          <span>Budget utilisé</span>
          <span className="tabular-nums text-foreground">{budgetUsed}%</span>
        </div>
        <div
          className="percentile-bar mt-4"
          data-state={budgetUsed > 90 ? 'over' : budgetUsed > 70 ? 'warn' : 'ok'}
          style={{ ['--percentile' as never]: `${pct}%` }}
        />
      </div>

      <div className="grid gap-px bg-hairline xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-px bg-hairline md:grid-cols-2">
          <div className="bg-background p-5">
            <p className="label-mono">Budget restant</p>
            <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
              {formatCurrency(remainingBudget)}
            </p>
          </div>
          <div className="bg-background p-5">
            <p className="label-mono">Salaire moyen</p>
            <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
              {formatCurrency(players.length > 0 ? Math.round(total / players.length) : 0)}
            </p>
          </div>
          {roleBudget.map((entry) => (
            <div key={entry.role} className="bg-background p-5">
              <p className="label-mono">{entry.role}</p>
              <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
                {formatCurrency(entry.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-background p-6">
          <p className="label-mono">Visual split</p>
          <h3 className="mt-3 display-md text-foreground">Par rôle.</h3>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Vue rapide de la concentration salariale sur le cinq majeur.
          </p>
          <div className="mt-6">
            <BudgetPieChart roleBudget={roleBudget} />
          </div>
        </div>
      </div>
    </div>
  );
}
