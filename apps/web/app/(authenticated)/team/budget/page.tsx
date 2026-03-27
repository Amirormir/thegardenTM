import { BudgetCalculator } from '@/components/features/team/budget-calculator';

export default function TeamBudgetPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Protected area</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Calculateur budget</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Base visuelle et structurelle prête pour le simulateur capitaine côté client.
        </p>
      </div>
      <BudgetCalculator />
    </div>
  );
}
