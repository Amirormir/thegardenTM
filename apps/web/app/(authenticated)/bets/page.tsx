'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import type { AppRouter } from '@/server/routers/_app';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate, formatCurrency } from '@/lib/utils/format';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En cours',
  WON: 'Gagné',
  LOST: 'Perdu',
  VOID: 'Remboursé',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'text-foreground-dim',
  WON: 'text-[color:var(--win)]',
  LOST: 'text-[color:var(--loss)]',
  VOID: 'text-foreground-muted',
};

type BetRow = inferRouterOutputs<AppRouter>['bet']['listMine'][number];

function BetLine({ bet }: { bet: BetRow }) {
  return (
    <Link
      href={`/league/matches/${bet.match.id}`}
      className="flex flex-col gap-3 border border-hairline bg-surface px-5 py-4 transition-colors hover:bg-surface-hover md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground">
            {bet.match.homeTeam.shortCode} – {bet.match.awayTeam.shortCode}
          </span>
          <span className="label-mono text-foreground-muted">{bet.match.format}</span>
        </div>
        <p className="label-mono text-foreground-muted">
          Mise sur <span className="text-foreground-dim">{bet.selectedTeam.shortCode}</span> ·{' '}
          {formatCompactDate(bet.placedAt)}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="label-mono text-foreground-muted">Mise · Cote</p>
          <p className="font-mono tabular-nums text-foreground">
            {formatCurrency(bet.stake)} @ {bet.oddsAtBet.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="label-mono text-foreground-muted">
            {bet.status === 'WON' ? 'Gain' : bet.status === 'PENDING' ? 'Gain potentiel' : 'Statut'}
          </p>
          <p className={cn('font-mono tabular-nums', STATUS_CLASS[bet.status])}>
            {bet.status === 'LOST' || bet.status === 'VOID'
              ? STATUS_LABEL[bet.status]
              : formatCurrency(bet.potentialPayout)}
          </p>
        </div>
        <span className={cn('w-16 text-right label-mono', STATUS_CLASS[bet.status])}>
          {STATUS_LABEL[bet.status] ?? bet.status}
        </span>
      </div>
    </Link>
  );
}

export default function BetsPage() {
  const betsQuery = api.bet.listMine.useQuery();
  const meQuery = api.user.me.useQuery();

  const bets = betsQuery.data ?? [];
  const pending = bets.filter((bet) => bet.status === 'PENDING');
  const history = bets.filter((bet) => bet.status !== 'PENDING');
  const totalAtStake = pending.reduce((sum, bet) => sum + bet.stake, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Compte · Paris</p>
        <h1 className="mt-4 display-lg text-foreground">Mes paris.</h1>
      </header>

      <section className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-3">
        <div className="bg-surface px-5 py-5">
          <p className="label-mono text-foreground-muted">Solde wallet</p>
          <p className="mt-2 font-mono tabular-nums text-2xl text-foreground">
            {formatCurrency(meQuery.data?.walletBalance ?? 0)}
          </p>
        </div>
        <div className="bg-surface px-5 py-5">
          <p className="label-mono text-foreground-muted">Misé en cours</p>
          <p className="mt-2 font-mono tabular-nums text-2xl text-foreground">
            {formatCurrency(totalAtStake)}
          </p>
        </div>
        <div className="col-span-2 bg-surface px-5 py-5 md:col-span-1">
          <p className="label-mono text-foreground-muted">Paris en cours</p>
          <p className="mt-2 font-mono tabular-nums text-2xl text-foreground">{pending.length}</p>
        </div>
      </section>

      {betsQuery.isLoading ? (
        <div className="flex items-center gap-3 label-mono text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : bets.length === 0 ? (
        <section className="flex flex-col items-center gap-4 border-y border-hairline py-16 text-center">
          <Ticket className="h-8 w-8 text-foreground-muted" />
          <p className="text-sm text-foreground-dim">
            Aucun pari pour le moment.{' '}
            <Link href="/league/matches" className="text-accent hover:text-foreground">
              Va miser sur un match
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <p className="label-mono">§ En cours</p>
            {pending.length > 0 ? (
              <div className="flex flex-col gap-3">
                {pending.map((bet) => (
                  <BetLine key={bet.id} bet={bet} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">Aucun pari en cours.</p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <p className="label-mono">§ Historique</p>
            {history.length > 0 ? (
              <div className="flex flex-col gap-3">
                {history.map((bet) => (
                  <BetLine key={bet.id} bet={bet} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">Aucun pari réglé pour l&apos;instant.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
