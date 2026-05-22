'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { OfferPlayerCard } from './offer-player-card';

interface Player {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  gameName: string;
  displayName?: string | null;
  imageUrl?: string | null;
  role: string;
  age?: number | null;
  marketValue: number;
  teamId: string | null;
  team: { id: string; name: string; shortCode: string; logoUrl?: string | null } | null;
}

interface Team {
  id: string;
  name: string;
  transferBudget: number;
  salaryBudgetCap: number;
  players: Array<{ id: string; salary: number; isActive: boolean }>;
}

interface ContractNegotiatorProps {
  teamId: string;
  team: Team;
  player: Player;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function ContractNegotiator({ teamId, team, player }: ContractNegotiatorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const createContract = api.contract.create.useMutation();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [salary, setSalary] = useState<number>(Math.max(0, player.marketValue));
  const [durationBo3, setDurationBo3] = useState<number>(10);
  const [releaseClause, setReleaseClause] = useState<number>(Math.max(1, player.marketValue * 2));
  const [notes, setNotes] = useState<string>('');

  const isFreeAgent = !player.teamId;
  const isOwnRoster = player.teamId === teamId;
  const canSign = isFreeAgent || isOwnRoster;

  const currentPayroll = useMemo(
    () => team.players.filter((p) => p.isActive && p.id !== player.id).reduce((sum, p) => sum + p.salary, 0),
    [team.players, player.id],
  );

  const projectedPayroll = currentPayroll + salary;
  const salaryRemainingAfter = team.salaryBudgetCap - projectedPayroll;
  const usagePct = team.salaryBudgetCap > 0 ? (projectedPayroll / team.salaryBudgetCap) * 100 : 0;
  const overCap = salaryRemainingAfter < 0;
  const totalCommitment = salary * durationBo3;

  const tierColor =
    usagePct >= 100 ? 'var(--loss)'
    : usagePct >= 90 ? '#fb923c'
    : usagePct >= 70 ? '#facc15'
    : 'var(--win)';

  const playerDisplayName = player.displayName ?? player.gameName;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!canSign) {
      setFeedback({
        type: 'error',
        message: 'Ce joueur appartient à une autre équipe. Passez par une offre de transfert.',
      });
      return;
    }

    try {
      await createContract.mutateAsync({
        playerId: player.id,
        teamId,
        salary,
        durationBo3,
        releaseClause,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await Promise.all([
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: 'Contrat soumis pour validation admin. Vous allez être redirigé.',
      });
      setTimeout(() => router.push('/team/contracts'), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La soumission a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isFreeAgent ? '/transfermarket' : '/team/contracts'}
          className="inline-flex items-center gap-2 label-mono text-foreground-dim hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <OfferPlayerCard
          player={{
            id: player.id,
            displayName: playerDisplayName,
            firstName: player.firstName,
            lastName: player.lastName,
            imageUrl: player.imageUrl,
            role: player.role,
            age: player.age,
            marketValue: player.marketValue,
          }}
          team={
            player.team
              ? {
                  name: player.team.name,
                  shortCode: player.team.shortCode,
                  logoUrl: player.team.logoUrl ?? null,
                }
              : null
          }
          statusLabel={isFreeAgent ? 'Free agent' : isOwnRoster ? 'Roster actuel' : 'Sous contrat'}
          statusTone={isFreeAgent ? 'positive' : isOwnRoster ? 'accent' : 'muted'}
          contextLabel={isFreeAgent ? 'LIBRE' : null}
        />

        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <header className="flex flex-col gap-3 border-b border-hairline pb-6">
            <p className="label-mono text-accent">Offre de contrat</p>
            <h2 className="display-md text-foreground">Conditions proposées</h2>
            <p className="text-sm leading-6 text-foreground-dim">
              Salaire annuel & durée du contrat. Soumis à validation admin.
            </p>
          </header>

          {!canSign ? (
            <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-[color:var(--loss)]">
              Ce joueur est sous contrat. Passez par une offre de transfert.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-y border-hairline bg-surface px-6 py-6">
            <label className="label-mono text-foreground-muted">Salaire proposé</label>
            <Input
              type="number"
              min={0}
              value={salary}
              onChange={(e) => setSalary(Math.max(0, Number.parseInt(e.target.value || '0', 10)))}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 font-display !text-4xl tabular-nums !text-foreground focus:!ring-0"
              required
            />
            <div className="flex items-center justify-between border-t border-hairline pt-3 text-xs">
              <span className="label-mono text-foreground-muted">
                Valeur marchande · {formatCurrency(player.marketValue)}
              </span>
              <span
                className="font-display tabular-nums"
                style={{ color: tierColor }}
              >
                Masse {usagePct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="label-mono text-foreground-muted">Durée (BO3)</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={durationBo3}
                onChange={(e) => setDurationBo3(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono text-foreground-muted">Clause libératoire</label>
              <Input
                type="number"
                min={1}
                value={releaseClause}
                onChange={(e) => setReleaseClause(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                required
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="label-mono text-foreground-muted">Message (optionnel)</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mot pour l'admin…"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-y border-hairline bg-surface px-5 py-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="label-mono text-foreground-muted">Marge salariale après</span>
              <span
                className="font-display tabular-nums"
                style={{ color: overCap ? 'var(--loss)' : 'var(--win)' }}
              >
                {formatCurrency(salaryRemainingAfter)}
              </span>
            </div>
            <div className="h-1 w-full bg-hairline">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${Math.min(100, usagePct)}%`, backgroundColor: tierColor }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-hairline pt-3">
              <span className="label-mono text-foreground-muted">
                Engagement total · {formatCurrency(salary)} × {durationBo3} BO
              </span>
              <span className="font-display tabular-nums text-foreground">
                {formatCurrency(totalCommitment)}
              </span>
            </div>
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
              type="submit"
              disabled={createContract.isPending || !canSign || overCap}
              icon={createContract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            >
              Soumettre l&apos;offre
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
