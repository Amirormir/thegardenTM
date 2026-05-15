'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayerLink } from '@/components/ui/player-link';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

type OfferStatus =
  | 'PENDING'
  | 'COUNTER_PROPOSED'
  | 'ACCEPTED'
  | 'VALIDATED_ADMIN'
  | 'CONTRACT_IN_PROGRESS'
  | 'FINALIZED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

interface Offer {
  id: string;
  status: OfferStatus;
  offeredFee: number;
  counterOffer: number | null;
  message: string | null;
  counterMessage: string | null;
  rejectionReason: string | null;
  respondedAt: Date | null;
  adminValidatedAt: Date | null;
  finalizedAt: Date | null;
  linkedContractId: string | null;
  createdAt: Date;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    gameName: string;
    tagLine: string;
    role: string;
    marketValue: number;
    salary: number;
    displayName: string;
  };
  fromTeam: {
    id: string;
    name: string;
    shortCode: string;
    transferBudget: number;
    salaryBudgetCap: number;
    players: Array<{ id: string; salary: number; isActive: boolean }>;
  };
  toTeam: {
    id: string;
    name: string;
    shortCode: string;
  };
}

interface TransferNegotiatorProps {
  teamId: string;
  offer: Offer;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: 'En attente',
  COUNTER_PROPOSED: 'Contre-proposition',
  ACCEPTED: 'Acceptée — en attente admin',
  VALIDATED_ADMIN: 'Validée admin',
  CONTRACT_IN_PROGRESS: 'Contrat en cours',
  FINALIZED: 'Finalisée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

const STEPS: Array<{ status: OfferStatus; label: string }> = [
  { status: 'PENDING', label: 'Proposée' },
  { status: 'ACCEPTED', label: 'Acceptée' },
  { status: 'VALIDATED_ADMIN', label: 'Validée admin' },
  { status: 'CONTRACT_IN_PROGRESS', label: 'Contrat' },
  { status: 'FINALIZED', label: 'Finalisée' },
];

function statusStepIndex(status: OfferStatus): number {
  if (status === 'COUNTER_PROPOSED' || status === 'PENDING') return 0;
  if (status === 'ACCEPTED') return 1;
  if (status === 'VALIDATED_ADMIN') return 2;
  if (status === 'CONTRACT_IN_PROGRESS') return 3;
  if (status === 'FINALIZED' || status === 'COMPLETED') return 4;
  return -1; // REJECTED, CANCELLED
}

export function TransferNegotiator({ teamId, offer }: TransferNegotiatorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const startContract = api.transfer.startContract.useMutation();

  const isBuyerCaptain = teamId === offer.fromTeam.id;
  const canStartContract = isBuyerCaptain && offer.status === 'VALIDATED_ADMIN' && !offer.linkedContractId;

  const [salary, setSalary] = useState<number>(Math.max(0, offer.player.salary || offer.player.marketValue));
  const [durationBo3, setDurationBo3] = useState<number>(10);
  const [releaseClause, setReleaseClause] = useState<number>(Math.max(1, offer.offeredFee * 2));
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const currentPayroll = useMemo(
    () => offer.fromTeam.players.filter((p) => p.isActive).reduce((sum, p) => sum + p.salary, 0),
    [offer.fromTeam.players],
  );

  const projectedPayroll = currentPayroll + salary;
  const salaryRemainingAfter = offer.fromTeam.salaryBudgetCap - projectedPayroll;
  const usagePct = offer.fromTeam.salaryBudgetCap > 0 ? (projectedPayroll / offer.fromTeam.salaryBudgetCap) * 100 : 0;
  const overCap = salaryRemainingAfter < 0;
  const transferBudgetAfter = offer.fromTeam.transferBudget - offer.offeredFee;
  const overTransferBudget = transferBudgetAfter < 0;

  const tier =
    usagePct >= 100 ? 'danger'
    : usagePct >= 90 ? 'critical'
    : usagePct >= 70 ? 'warning'
    : 'safe';

  const tierColor = {
    safe: 'var(--win)',
    warning: '#facc15',
    critical: '#fb923c',
    danger: 'var(--loss)',
  }[tier];

  const currentStep = statusStepIndex(offer.status);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    try {
      await startContract.mutateAsync({
        id: offer.id,
        salary,
        durationBo3,
        releaseClause,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await Promise.all([
        utils.transfer.getById.invalidate({ id: offer.id }),
        utils.transfer.getByTeam.invalidate(),
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: 'Contrat soumis. En attente de validation admin pour finaliser le transfert.',
      });
      setTimeout(() => router.refresh(), 800);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La soumission a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/team" className="inline-flex items-center gap-2 label-mono text-foreground-dim hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Retour équipe
          </Link>
          <Badge variant={offer.player.role as never}>{offer.player.role}</Badge>
        </div>

        <section className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-accent">Transfert</p>
          <h2 className="mt-3 display-md text-foreground">
            <PlayerLink playerId={offer.player.id}>{offer.player.displayName}</PlayerLink>
          </h2>
          <p className="mt-2 label-mono text-foreground-dim">
            {offer.toTeam.shortCode} — {offer.toTeam.name} → {offer.fromTeam.shortCode} — {offer.fromTeam.name}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <div>
              <dt className="label-mono text-foreground-muted">Indemnité</dt>
              <dd className="mt-1 font-display tabular-nums text-foreground">
                {formatCurrency(offer.offeredFee)}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Valeur marchande</dt>
              <dd className="mt-1 font-display tabular-nums text-foreground">
                {formatCurrency(offer.player.marketValue)}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Statut</dt>
              <dd className="mt-1 label-mono text-foreground">{STATUS_LABEL[offer.status]}</dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Créée le</dt>
              <dd className="mt-1 label-mono text-foreground">{formatDateTime(offer.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="border-y border-hairline bg-surface p-6">
          <p className="label-mono">Avancement</p>
          <ol className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {STEPS.map((step, idx) => {
              const done = currentStep > idx;
              const active = currentStep === idx;
              return (
                <li key={step.status} className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full border label-mono',
                      done && 'border-[color:var(--win)] bg-[color:var(--win)]/15 text-[color:var(--win)]',
                      active && 'border-accent bg-accent/15 text-accent',
                      !done && !active && 'border-hairline text-foreground-muted',
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span
                    className={cn(
                      'label-mono',
                      done && 'text-[color:var(--win)]',
                      active && 'text-accent',
                      !done && !active && 'text-foreground-muted',
                    )}
                  >
                    {step.label}
                  </span>
                  {idx < STEPS.length - 1 ? (
                    <span className="hidden h-px w-8 bg-hairline md:inline-block" />
                  ) : null}
                </li>
              );
            })}
          </ol>
          {offer.status === 'REJECTED' || offer.status === 'CANCELLED' ? (
            <p className="mt-4 label-mono text-[color:var(--loss)]">
              Offre {offer.status === 'REJECTED' ? 'rejetée' : 'annulée'}.{' '}
              {offer.rejectionReason ?? ''}
            </p>
          ) : null}
        </section>

        {canStartContract ? (
          <form className="flex flex-col gap-6 border-y border-l-2 border-l-accent border-r border-hairline bg-surface p-6" onSubmit={handleSubmit}>
            <div>
              <p className="label-mono text-accent">Proposer les conditions contractuelles</p>
              <p className="mt-2 text-sm leading-6 text-foreground-dim">
                Le transfert est validé. Définissez le contrat — soumis ensuite à approbation admin.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="label-mono">Salaire</label>
                <Input
                  type="number"
                  min={0}
                  value={salary}
                  onChange={(e) => setSalary(Math.max(0, Number.parseInt(e.target.value || '0', 10)))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="label-mono">Durée (BO3)</label>
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
                <label className="label-mono">Clause libératoire</label>
                <Input
                  type="number"
                  min={1}
                  value={releaseClause}
                  onChange={(e) => setReleaseClause(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="label-mono">Notes</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel" />
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
                disabled={startContract.isPending || overCap}
                icon={startContract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              >
                Soumettre le contrat
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        ) : null}

        {offer.status === 'CONTRACT_IN_PROGRESS' ? (
          <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-accent">
            Contrat soumis. En attente de validation admin pour finaliser le transfert.
          </div>
        ) : null}

        {offer.status === 'FINALIZED' ? (
          <div className="border-l-2 border-l-[color:var(--win)] border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-[color:var(--win)]">
            Transfert finalisé le {offer.finalizedAt ? formatDateTime(offer.finalizedAt) : '—'}.
          </div>
        ) : null}
      </div>

      <aside className="flex flex-col gap-5">
        <section className="border-y border-l-2 border-l-accent/40 border-r border-hairline bg-surface p-5">
          <p className="label-mono text-accent">Budget transfert</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Disponible</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(offer.fromTeam.transferBudget)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Indemnité</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(offer.offeredFee)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Solde après</dt>
              <dd
                className="font-display tabular-nums"
                style={{ color: overTransferBudget ? 'var(--loss)' : 'var(--win)' }}
              >
                {formatCurrency(transferBudgetAfter)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-y border-l-2 border-l-accent border-r border-hairline bg-surface p-5">
          <p className="label-mono text-accent">Impact masse salariale</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Plafond</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(offer.fromTeam.salaryBudgetCap)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Masse actuelle</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(currentPayroll)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Masse projetée</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(projectedPayroll)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Marge restante</dt>
              <dd className="font-display tabular-nums" style={{ color: overCap ? 'var(--loss)' : 'var(--win)' }}>
                {formatCurrency(salaryRemainingAfter)}
              </dd>
            </div>
          </dl>
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <p className="label-mono text-foreground-muted">Utilisation</p>
              <p className="font-display tabular-nums text-sm" style={{ color: tierColor }}>
                {usagePct.toFixed(1)}%
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-hairline">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${Math.min(100, usagePct)}%`, backgroundColor: tierColor }}
              />
            </div>
          </div>
        </section>

        <section className="border-y border-hairline bg-surface p-5 text-xs leading-6 text-foreground-dim">
          <p className="label-mono text-foreground-muted">Rappels</p>
          <ul className="mt-3 list-disc pl-4 space-y-1">
            <li>Le contrat n&apos;est actif qu&apos;après validation admin.</li>
            <li>L&apos;indemnité est débitée du budget transfert à la finalisation.</li>
            <li>Le joueur change d&apos;équipe au moment de l&apos;approbation du contrat.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
