'use client';

import { ArrowLeftRight, Loader2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

type Direction = 'TRANSFER_TO_SALARY' | 'SALARY_TO_TRANSFER';

interface BudgetSliderProps {
  teamId: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function BudgetSlider({ teamId }: BudgetSliderProps) {
  const utils = api.useUtils();
  const snapshotQuery = api.team.getBudgetSnapshot.useQuery({ teamId });
  const convertMutation = api.team.convertBudget.useMutation();

  const [direction, setDirection] = useState<Direction>('TRANSFER_TO_SALARY');
  const [amount, setAmount] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const snapshot = snapshotQuery.data;
  const n = snapshot?.nUsed ?? 18;
  const transferBudget = snapshot?.transferBudget ?? 0;
  const salaryCap = snapshot?.salaryBudgetCap ?? 0;
  const payroll = snapshot?.payroll ?? 0;
  const salaryRemaining = snapshot?.salaryRemaining ?? 0;

  const maxAmount = useMemo(() => {
    if (!snapshot) return 0;
    return direction === 'TRANSFER_TO_SALARY'
      ? snapshot.conversion.maxTransferToSalary
      : snapshot.conversion.maxSalaryToTransfer;
  }, [snapshot, direction]);

  useEffect(() => {
    setAmount(0);
    setFeedback(null);
  }, [direction, snapshot?.transferBudget, snapshot?.salaryBudgetCap]);

  const minAmount = direction === 'TRANSFER_TO_SALARY' ? n : 1;
  const step = direction === 'TRANSFER_TO_SALARY' ? n : 1;

  const safeAmount = Math.min(Math.max(0, amount), maxAmount);

  const preview = useMemo(() => {
    if (direction === 'TRANSFER_TO_SALARY') {
      const salaryGain = Math.floor(safeAmount / n);
      return {
        transferDelta: -safeAmount,
        salaryDelta: salaryGain,
        nextTransfer: transferBudget - safeAmount,
        nextSalaryCap: salaryCap + salaryGain,
        valid: safeAmount >= n && salaryGain > 0,
      };
    }
    const transferGain = safeAmount * n;
    const nextCap = salaryCap - safeAmount;
    return {
      transferDelta: transferGain,
      salaryDelta: -safeAmount,
      nextTransfer: transferBudget + transferGain,
      nextSalaryCap: nextCap,
      valid: safeAmount >= 1 && nextCap >= payroll,
    };
  }, [direction, safeAmount, n, transferBudget, salaryCap, payroll]);

  const usagePctAfter = preview.nextSalaryCap > 0 ? (payroll / preview.nextSalaryCap) * 100 : 0;
  const overCapAfter = preview.nextSalaryCap < payroll;

  async function handleSubmit() {
    if (!snapshot) return;
    setFeedback(null);
    if (!preview.valid || safeAmount <= 0) {
      setFeedback({ type: 'error', message: 'Montant invalide pour cette conversion.' });
      return;
    }
    try {
      await convertMutation.mutateAsync({ teamId, direction, amount: safeAmount });
      await Promise.all([
        utils.team.getBudgetSnapshot.invalidate({ teamId }),
        utils.team.getById.invalidate(),
      ]);
      setFeedback({ type: 'success', message: 'Conversion appliquée.' });
      setAmount(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Échec de la conversion.';
      setFeedback({ type: 'error', message });
    }
  }

  if (snapshotQuery.isLoading) {
    return (
      <section className="border-y border-hairline bg-surface p-8 label-mono text-foreground-muted">
        Chargement du snapshot budgétaire…
      </section>
    );
  }

  if (snapshotQuery.isError || !snapshot) {
    return (
      <section className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-[color:var(--loss)]">
        Impossible de charger le snapshot budgétaire.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8 border-y border-hairline bg-surface p-6 md:p-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <p className="label-mono text-accent">Conversion budgétaire</p>
          <h2 className="mt-2 display-md text-foreground">Slider d&apos;arbitrage.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-dim">
            Convertis du budget transfert en plafond salarial (taux 1 / {n}) ou inversement
            (taux {n} pour 1).
          </p>
        </div>
        <div className="border-l border-hairline pl-5">
          <p className="label-mono text-foreground-muted">N (BO max saison régulière)</p>
          <p className="mt-2 font-display text-2xl tabular-nums text-foreground">{n}</p>
        </div>
      </header>

      <div className="grid gap-px bg-hairline md:grid-cols-2">
        <div className="bg-background p-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            <p className="label-mono">Budget transfert</p>
          </div>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
            {formatCurrency(transferBudget)}
          </p>
          <p className="mt-2 text-xs leading-5 text-foreground-muted">Cash mobilisable pour indemnités.</p>
        </div>
        <div className="bg-background p-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            <p className="label-mono">Plafond salarial</p>
          </div>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
            {formatCurrency(salaryCap)}
          </p>
          <p className="mt-2 text-xs leading-5 text-foreground-muted">
            Masse actuelle: {formatCurrency(payroll)} · Marge: {formatCurrency(salaryRemaining)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDirection('TRANSFER_TO_SALARY')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs label-mono transition-colors',
            direction === 'TRANSFER_TO_SALARY'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-hairline text-foreground-dim hover:text-foreground',
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Transfert → Salaire
        </button>
        <button
          type="button"
          onClick={() => setDirection('SALARY_TO_TRANSFER')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs label-mono transition-colors',
            direction === 'SALARY_TO_TRANSFER'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-hairline text-foreground-dim hover:text-foreground',
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 rotate-180" />
          Salaire → Transfert
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <label className="label-mono">
            {direction === 'TRANSFER_TO_SALARY'
              ? 'Montant à prélever du budget transfert'
              : 'Marge salariale à convertir en cash'}
          </label>
          <span className="label-mono text-foreground-muted">
            Max: {formatCurrency(maxAmount)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(maxAmount, minAmount)}
          step={step}
          value={safeAmount}
          onChange={(e) => setAmount(Number.parseInt(e.target.value || '0', 10))}
          disabled={maxAmount <= 0}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hairline accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            type="number"
            min={0}
            max={maxAmount}
            step={step}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number.parseInt(e.target.value || '0', 10)))}
            disabled={maxAmount <= 0}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAmount(maxAmount)}
            disabled={maxAmount <= 0}
          >
            Max
          </Button>
        </div>

        {direction === 'TRANSFER_TO_SALARY' && safeAmount > 0 && safeAmount < n ? (
          <p className="text-xs label-mono text-[color:var(--loss)]">
            Minimum {n} (1 unité de salaire = {n} de transfert).
          </p>
        ) : null}
      </div>

      <div className="grid gap-px bg-hairline md:grid-cols-2">
        <div className="bg-background p-5">
          <p className="label-mono text-foreground-muted">Budget transfert après</p>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground">
            {formatCurrency(preview.nextTransfer)}
          </p>
          <p
            className="mt-1 label-mono text-xs"
            style={{ color: preview.transferDelta >= 0 ? 'var(--win)' : 'var(--loss)' }}
          >
            {preview.transferDelta >= 0 ? '+' : ''}
            {formatCurrency(preview.transferDelta)}
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="label-mono text-foreground-muted">Plafond salarial après</p>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground">
            {formatCurrency(preview.nextSalaryCap)}
          </p>
          <p
            className="mt-1 label-mono text-xs"
            style={{ color: preview.salaryDelta >= 0 ? 'var(--win)' : 'var(--loss)' }}
          >
            {preview.salaryDelta >= 0 ? '+' : ''}
            {formatCurrency(preview.salaryDelta)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="label-mono text-foreground-muted">Utilisation plafond après conversion</p>
          <p
            className="font-display tabular-nums text-sm"
            style={{ color: overCapAfter ? 'var(--loss)' : 'var(--win)' }}
          >
            {usagePctAfter.toFixed(1)}%
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full bg-hairline">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, usagePctAfter)}%`,
              backgroundColor: overCapAfter ? 'var(--loss)' : 'var(--accent)',
            }}
          />
        </div>
        {overCapAfter ? (
          <p className="mt-2 text-xs label-mono text-[color:var(--loss)]">
            Le plafond passerait sous la masse salariale active ({formatCurrency(payroll)}).
          </p>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={cn(
            'border-l-2 border-y border-r border-hairline bg-surface px-5 py-4 label-mono',
            feedback.type === 'success'
              ? 'border-l-[color:var(--win)] text-[color:var(--win)]'
              : 'border-l-[color:var(--loss)] text-[color:var(--loss)]',
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={
            convertMutation.isPending ||
            !preview.valid ||
            safeAmount <= 0 ||
            maxAmount <= 0
          }
          icon={
            convertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="h-4 w-4" />
            )
          }
        >
          Convertir
        </Button>
        <Button type="button" variant="secondary" onClick={() => setAmount(0)} disabled={amount === 0}>
          Réinitialiser
        </Button>
      </div>
    </section>
  );
}
