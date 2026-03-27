import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';
import { formatCurrency } from '@/lib/utils/format';
import { roleBudget } from '@/lib/utils/mock-data';

const SALARY_BUDGET = 1200000;

export function BudgetCalculator() {
  const total = roleBudget.reduce((sum, entry) => sum + entry.value, 0);
  const budgetUsed = Math.round((total / SALARY_BUDGET) * 100);

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-kicker">Client-side simulation</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Budget calculator</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-text-secondary">
            Base prête pour la future logique interactive. Le calcul actuel est volontairement
            local et instantané, conformément à la spec.
          </p>
        </div>
        <PlayerValue value={total} delta={32000} size="sm" />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Budget used</span>
          <span className="font-semibold text-white">{budgetUsed}%</span>
        </div>
        <div className="mt-3 h-3 rounded-full bg-white/8">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-accent-primary to-accent-gold"
            style={{ width: `${Math.min(budgetUsed, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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
    </Card>
  );
}
