'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Lock, Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

const BET_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En cours',
  WON: 'Gagné',
  LOST: 'Perdu',
  VOID: 'Remboursé',
};

interface MatchBetSlipProps {
  matchId: string;
}

export function MatchBetSlip({ matchId }: MatchBetSlipProps) {
  const { status: authStatus } = useSession();
  const isAuthed = authStatus === 'authenticated';

  const oddsQuery = api.odds.getForMatch.useQuery({ matchId });
  const meQuery = api.user.me.useQuery(undefined, { enabled: isAuthed });
  const summaryQuery = api.bet.getMatchBetSummary.useQuery({ matchId }, { enabled: isAuthed });
  const utils = api.useUtils();
  const placeBet = api.bet.place.useMutation();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [stake, setStake] = useState('');
  const [error, setError] = useState<string | null>(null);

  const odds = oddsQuery.data;
  const wallet = meQuery.data?.walletBalance ?? 0;
  const myBets = summaryQuery.data?.bets ?? [];

  const selectedOdds = useMemo(() => {
    if (!odds || !selectedTeamId) return null;
    if (selectedTeamId === odds.homeTeam.id) return odds.oddsHome;
    if (selectedTeamId === odds.awayTeam.id) return odds.oddsAway;
    return null;
  }, [odds, selectedTeamId]);

  const stakeValue = Number.parseInt(stake, 10);
  const validStake = Number.isFinite(stakeValue) && stakeValue > 0;
  const potentialPayout =
    selectedOdds && validStake ? Math.round(stakeValue * selectedOdds) : null;
  const walletAfter = validStake ? wallet - stakeValue : wallet;

  async function handlePlace() {
    setError(null);
    if (!selectedTeamId || !validStake) return;

    try {
      await placeBet.mutateAsync({ matchId, selectedTeamId, stake: stakeValue });
      setStake('');
      setSelectedTeamId(null);
      await Promise.all([
        utils.bet.getMatchBetSummary.invalidate({ matchId }),
        utils.user.me.invalidate(),
        utils.bet.listMine.invalidate(),
      ]);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : 'Le pari a échoué.',
      );
    }
  }

  if (oddsQuery.isLoading) {
    return (
      <section className="border border-hairline bg-surface p-6">
        <div className="flex items-center gap-3 label-mono text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des cotes…
        </div>
      </section>
    );
  }

  // Pas de cotes disponibles (équipes sans rating / saison non seedée).
  if (!odds || (odds.oddsHome === null && odds.oddsAway === null)) {
    return null;
  }

  const locked = !odds.bettingOpen;

  return (
    <section className="border border-hairline bg-surface">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <p className="label-mono inline-flex items-center gap-2">
          <Ticket className="h-3.5 w-3.5 text-accent" /> Paris
        </p>
        {locked ? (
          <span className="label-mono inline-flex items-center gap-2 text-foreground-muted">
            <Lock className="h-3.5 w-3.5" /> Paris fermés
          </span>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-px bg-hairline">
        {[
          { team: odds.homeTeam, value: odds.oddsHome },
          { team: odds.awayTeam, value: odds.oddsAway },
        ].map(({ team, value }) => {
          const active = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={locked || value === null}
              onClick={() => setSelectedTeamId(active ? null : team.id)}
              className={cn(
                'flex flex-col items-center gap-3 bg-background px-4 py-6 transition-colors',
                locked
                  ? 'cursor-not-allowed opacity-60'
                  : active
                    ? 'bg-accent/10'
                    : 'hover:bg-surface-hover',
              )}
            >
              <TeamAvatar
                name={team.name}
                shortCode={team.shortCode}
                logoUrl={team.logoUrl ?? null}
                size="md"
              />
              <span className="text-sm font-semibold text-foreground">{team.shortCode}</span>
              <span
                className={cn(
                  'font-mono tabular-nums text-2xl',
                  active ? 'text-accent' : 'text-foreground',
                )}
              >
                {value !== null ? value.toFixed(2) : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {!locked ? (
        <div className="flex flex-col gap-4 px-6 py-5">
          {!isAuthed ? (
            <p className="text-sm text-foreground-dim">
              <Link href="/login" className="text-accent hover:text-foreground">
                Connecte-toi
              </Link>{' '}
              pour parier sur ce match.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between label-mono text-foreground-dim">
                <span>Solde wallet</span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatCurrency(wallet)}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="bet-stake" className="label-mono">
                  Mise {selectedTeamId ? '' : '· choisis une équipe'}
                </label>
                <Input
                  id="bet-stake"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="0"
                  value={stake}
                  disabled={!selectedTeamId || placeBet.isPending}
                  onChange={(event) => setStake(event.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-4">
                <div className="label-mono text-foreground-dim">Gain potentiel</div>
                <div className="font-mono tabular-nums text-lg text-accent">
                  {potentialPayout !== null ? formatCurrency(potentialPayout) : '—'}
                </div>
              </div>
              <div className="flex items-center justify-between label-mono text-foreground-muted">
                <span>Solde après mise</span>
                <span
                  className={cn(
                    'font-mono tabular-nums',
                    validStake && walletAfter < 0 ? 'text-[color:var(--loss)]' : '',
                  )}
                >
                  {formatCurrency(walletAfter)}
                </span>
              </div>

              {error ? (
                <p className="border-l-2 border-[color:var(--loss)] bg-background px-3 py-2 label-mono text-[color:var(--loss)]">
                  {error}
                </p>
              ) : null}

              <Button
                type="button"
                disabled={
                  !selectedTeamId ||
                  !validStake ||
                  walletAfter < 0 ||
                  placeBet.isPending
                }
                onClick={() => void handlePlace()}
                icon={placeBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              >
                {placeBet.isPending ? 'Placement…' : 'Parier'}
              </Button>
            </>
          )}
        </div>
      ) : null}

      {isAuthed && myBets.length > 0 ? (
        <div className="border-t border-hairline px-6 py-5">
          <p className="label-mono text-foreground-dim">Mes paris sur ce match</p>
          <ul className="mt-3 flex flex-col gap-2">
            {myBets.map((bet) => (
              <li
                key={bet.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-foreground">
                  {bet.selectedTeam.shortCode} ·{' '}
                  <span className="font-mono tabular-nums text-foreground-dim">
                    {formatCurrency(bet.stake)} @ {bet.oddsAtBet.toFixed(2)}
                  </span>
                </span>
                <span
                  className={cn(
                    'label-mono',
                    bet.status === 'WON'
                      ? 'text-[color:var(--win)]'
                      : bet.status === 'LOST'
                        ? 'text-[color:var(--loss)]'
                        : 'text-foreground-dim',
                  )}
                >
                  {BET_STATUS_LABEL[bet.status] ?? bet.status}
                  {bet.status === 'PENDING' ? (
                    <span className="ml-2 font-mono text-accent">
                      → {formatCurrency(bet.potentialPayout)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
