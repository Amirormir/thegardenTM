'use client';

import { AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { PayrollProjectionChart } from '@/components/features/charts/payroll-projection-chart';
import { PlayerLink } from '@/components/ui/player-link';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface PayrollProjectionProps {
  teamId: string;
  horizon?: number;
}

export function PayrollProjection({ teamId, horizon = 20 }: PayrollProjectionProps) {
  const projection = api.team.getPayrollProjection.useQuery({ teamId, horizon });

  if (projection.isLoading) {
    return (
      <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-4 label-mono text-foreground-dim">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calcul de la projection…
      </div>
    );
  }

  if (projection.isError || !projection.data) {
    return (
      <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-[color:var(--loss)]">
        Impossible de calculer la projection salariale.
      </div>
    );
  }

  const data = projection.data;
  const overCap = data.currentPayroll > data.salaryBudgetCap;
  const usagePct =
    data.salaryBudgetCap > 0 ? (data.currentPayroll / data.salaryBudgetCap) * 100 : 0;
  const pendingUsagePct =
    data.salaryBudgetCap > 0
      ? ((data.currentPayroll + data.pendingPayroll) / data.salaryBudgetCap) * 100
      : 0;

  const cliffs = data.projection.filter((point) => point.expiringAtStep.length > 0);
  const nextCliff = cliffs[0];

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-px bg-hairline md:grid-cols-3">
        <div className="bg-background p-5">
          <p className="label-mono">Masse salariale active</p>
          <p
            className={cn(
              'mt-3 font-display text-2xl tabular-nums md:text-3xl',
              overCap ? 'text-[color:var(--loss)]' : 'text-foreground',
            )}
          >
            {formatCurrency(data.currentPayroll)}
          </p>
          <p className="mt-2 label-mono text-foreground-muted tabular-nums">
            / {formatCurrency(data.salaryBudgetCap)} · {usagePct.toFixed(0)}%
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="label-mono">Engagement total</p>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
            {formatCurrency(data.totalWageCommitment)}
          </p>
          <p className="mt-2 label-mono text-foreground-muted tabular-nums">
            Sur l&apos;ensemble des BO restants
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="label-mono">En attente d&apos;approbation</p>
          <p className="mt-3 font-display text-2xl tabular-nums text-foreground md:text-3xl">
            {formatCurrency(data.pendingCommitment)}
          </p>
          <p className="mt-2 label-mono text-foreground-muted tabular-nums">
            {data.pending.length} contrat{data.pending.length > 1 ? 's' : ''} · projection en
            pointillé
          </p>
        </div>
      </div>

      {data.pendingPayroll > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-y border-hairline bg-surface px-5 py-3 text-xs">
          <span className="label-mono text-foreground-muted">
            Avec contrats en attente · {formatCurrency(data.currentPayroll + data.pendingPayroll)} /{' '}
            {formatCurrency(data.salaryBudgetCap)} · {pendingUsagePct.toFixed(0)}%
          </span>
        </div>
      ) : null}

      <div>
        <p className="label-mono">Projection sur {data.horizon} BO</p>
        <h3 className="mt-3 display-md text-foreground">Courbe d&apos;engagement.</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-foreground-dim">
          Masse salariale projetée à mesure que les contrats consument leurs BO. La ligne en
          pointillé représente le plafond. Les marches descendantes signalent une expiration.
        </p>
        <div className="mt-6 border border-hairline bg-surface p-4">
          <PayrollProjectionChart
            data={data.projection.map((point) => ({
              boOffset: point.boOffset,
              payroll: point.payroll,
              payrollWithPending: point.payrollWithPending,
            }))}
            cap={data.salaryBudgetCap}
          />
        </div>
      </div>

      {nextCliff ? (
        <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface px-5 py-4">
          <div className="flex items-center gap-2 label-mono text-accent">
            <TrendingDown className="h-3.5 w-3.5" />
            Prochaine falaise · BO+{nextCliff.boOffset}
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            {nextCliff.expiringAtStep.length} contrat
            {nextCliff.expiringAtStep.length > 1 ? 's' : ''} arrive
            {nextCliff.expiringAtStep.length > 1 ? 'nt' : ''} à terme. Libération salariale :{' '}
            <span className="font-display tabular-nums text-foreground">
              {formatCurrency(
                nextCliff.expiringAtStep.reduce((sum, c) => sum + c.salary, 0),
              )}
            </span>
            .
          </p>
          <ul className="mt-4 grid gap-2">
            {nextCliff.expiringAtStep.map((entry) => (
              <li
                key={entry.contractId}
                className="flex items-center justify-between gap-3 border-t border-hairline pt-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={entry.playerRole}>{entry.playerRole}</Badge>
                  <PlayerLink playerId={entry.playerId} className="truncate text-foreground">
                    {entry.playerName}
                  </PlayerLink>
                </div>
                <span className="font-display tabular-nums text-foreground-dim">
                  {formatCurrency(entry.salary)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.topCommitments.length > 0 ? (
        <div>
          <p className="label-mono">Top engagements</p>
          <h3 className="mt-3 display-md text-foreground">Les 5 contrats les plus coûteux.</h3>
          <ul className="mt-6 border-t border-hairline">
            {data.topCommitments.map((entry) => (
              <li
                key={entry.contractId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-hairline py-4"
              >
                <Badge variant={entry.playerRole}>{entry.playerRole}</Badge>
                <PlayerLink
                  playerId={entry.playerId}
                  className="truncate font-display text-foreground"
                >
                  {entry.playerName}
                </PlayerLink>
                <div className="text-right label-mono tabular-nums text-foreground-muted">
                  {formatCurrency(entry.salary)} × {entry.bosRemaining} BO
                </div>
                <div className="text-right font-display text-lg tabular-nums text-foreground">
                  {formatCurrency(entry.totalCommitment)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.pending.length > 0 ? (
        <div>
          <p className="label-mono text-accent">En attente d&apos;approbation</p>
          <h3 className="mt-3 display-md text-foreground">Si tous les contrats sont validés.</h3>
          <ul className="mt-6 border-t border-hairline">
            {data.pending.map((entry) => (
              <li
                key={entry.contractId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-hairline py-4"
              >
                <Badge variant={entry.playerRole}>{entry.playerRole}</Badge>
                <PlayerLink
                  playerId={entry.playerId}
                  className="truncate font-display text-foreground"
                >
                  {entry.playerName}
                </PlayerLink>
                <div className="text-right label-mono tabular-nums text-foreground-muted">
                  {formatCurrency(entry.salary)} × {entry.plannedBos} BO
                </div>
                <div className="text-right font-display text-lg tabular-nums text-foreground">
                  {formatCurrency(entry.totalCommitment)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overCap ? (
        <div className="flex items-start gap-3 border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-5 py-4">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-[color:var(--loss)]" />
          <p className="text-sm leading-6 text-foreground-dim">
            La masse salariale dépasse actuellement le plafond. Aucun nouveau contrat ne pourra
            être validé tant que la situation n&apos;est pas rééquilibrée.
          </p>
        </div>
      ) : null}
    </div>
  );
}
