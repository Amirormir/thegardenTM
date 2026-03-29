import { BudgetPieChart } from '@/components/features/charts/budget-pie-chart';
import { Card } from '@/components/ui/card';
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

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-kicker">Client-side simulation</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Budget calculator</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-text-secondary">
            Repartition des salaires par role et utilisation du budget.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Total salaires</p>
          <p className="mt-1 font-mono text-xl font-semibold text-white">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Budget used</span>
          <span className="font-semibold text-white">{budgetUsed}%</span>
        </div>
        <div className="mt-3 h-3 rounded-full bg-white/8">
          <div
            className={`h-3 rounded-full ${
              budgetUsed > 90
                ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                : budgetUsed > 70
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-accent-primary to-accent-gold'
            }`}
            style={{ width: `${Math.min(budgetUsed, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
              Budget restant
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">
              {formatCurrency(remainingBudget)}
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
              Salaire moyen
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">
              {formatCurrency(players.length > 0 ? Math.round(total / players.length) : 0)}
            </p>
          </div>

          {roleBudget.map((entry) => (
            <div
              key={entry.role}
              className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                {entry.role}
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-white">
                {formatCurrency(entry.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
          <p className="text-kicker">Visual split</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-white">Budget par role</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            Vue rapide de la concentration salariale sur le cinq majeur.
          </p>
          <div className="mt-4">
            <BudgetPieChart roleBudget={roleBudget} />
          </div>
        </div>
      </div>
    </Card>
  );
}
