'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayerLink } from '@/components/ui/player-link';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  gameName: string;
  displayName?: string | null;
  role: string;
  marketValue: number;
  teamId: string | null;
  team: { id: string; name: string; shortCode: string } | null;
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
  const [transferFee, setTransferFee] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  const isFreeAgent = !player.teamId;
  const isOwnRoster = player.teamId === teamId;
  const canSign = isFreeAgent || isOwnRoster;

  const currentPayroll = useMemo(
    () => team.players.filter((p) => p.isActive && p.id !== player.id).reduce((sum, p) => sum + p.salary, 0),
    [team.players, player.id],
  );

  const projectedPayroll = currentPayroll + salary;
  const salaryRemainingBefore = team.salaryBudgetCap - currentPayroll;
  const salaryRemainingAfter = team.salaryBudgetCap - projectedPayroll;
  const usagePct = team.salaryBudgetCap > 0 ? (projectedPayroll / team.salaryBudgetCap) * 100 : 0;
  const overCap = salaryRemainingAfter < 0;

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
        ...(transferFee !== '' ? { transferFee: Number(transferFee) } : {}),
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
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/transfermarket" className="inline-flex items-center gap-2 label-mono text-foreground-dim hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Retour au marché
          </Link>
          <Badge variant={player.role as never}>{player.role}</Badge>
        </div>

        <section className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-accent">Profil cible</p>
          <h2 className="mt-3 display-md text-foreground">
            <PlayerLink playerId={player.id}>{player.displayName ?? player.gameName}</PlayerLink>
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <div>
              <dt className="label-mono text-foreground-muted">Valeur marchande</dt>
              <dd className="mt-1 font-display tabular-nums text-foreground">
                {formatCurrency(player.marketValue)}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Équipe actuelle</dt>
              <dd className="mt-1 label-mono text-foreground">
                {player.team ? `${player.team.shortCode} — ${player.team.name}` : 'Free agent'}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-foreground-muted">Statut</dt>
              <dd className="mt-1 label-mono text-foreground">
                {isFreeAgent ? 'Libre' : isOwnRoster ? 'Roster actuel' : 'Autre équipe'}
              </dd>
            </div>
          </dl>
        </section>

        {!canSign ? (
          <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-5 py-4 label-mono text-[color:var(--loss)]">
            Ce joueur est sous contrat avec {player.team?.name}. Pour le signer, vous devez passer
            par une offre de transfert.
          </div>
        ) : null}

        <form className="flex flex-col gap-6 border-y border-hairline bg-surface p-6" onSubmit={handleSubmit}>
          <p className="label-mono">Conditions proposées</p>
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
              <p className="text-xs leading-6 text-foreground-muted">
                Compte dans la masse salariale.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Durée (nombre de BO3)</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={durationBo3}
                onChange={(e) => setDurationBo3(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                required
              />
              <p className="text-xs leading-6 text-foreground-muted">
                Le contrat expire après ce nombre de BO3.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Clause libératoire *</label>
              <Input
                type="number"
                min={1}
                value={releaseClause}
                onChange={(e) => setReleaseClause(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                required
              />
              <p className="text-xs leading-6 text-foreground-muted">
                Toute offre ≥ clause déclenche un transfert automatique.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Frais de transfert</label>
              <Input
                type="number"
                min={0}
                value={transferFee}
                onChange={(e) => {
                  const v = e.target.value;
                  setTransferFee(v === '' ? '' : Math.max(0, Number.parseInt(v, 10)));
                }}
                placeholder={isFreeAgent ? 'Free agent — aucun frais' : 'Optionnel'}
                disabled={isFreeAgent}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="label-mono">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Joueur clé pour la rotation mid…"
              />
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
              Soumettre pour validation
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </div>

      <aside className="flex flex-col gap-5">
        <section className="border-y border-l-2 border-l-accent border-r border-hairline bg-surface p-5">
          <p className="label-mono text-accent">Impact masse salariale</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Plafond</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(team.salaryBudgetCap)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Masse actuelle</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(currentPayroll)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Marge actuelle</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(salaryRemainingBefore)}
              </dd>
            </div>
            <div className="mt-3 h-px bg-hairline" />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Masse projetée</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(projectedPayroll)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Marge après contrat</dt>
              <dd
                className="font-display tabular-nums"
                style={{ color: overCap ? 'var(--loss)' : 'var(--win)' }}
              >
                {formatCurrency(salaryRemainingAfter)}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <p className="label-mono text-foreground-muted">Utilisation projetée</p>
              <p className="font-display tabular-nums text-sm" style={{ color: tierColor }}>
                {usagePct.toFixed(1)}%
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-hairline">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, usagePct)}%`,
                  backgroundColor: tierColor,
                }}
              />
            </div>
          </div>
        </section>

        <section className="border-y border-l-2 border-l-accent/40 border-r border-hairline bg-surface p-5">
          <p className="label-mono text-accent">Budget transfert</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label-mono text-foreground-muted">Disponible</dt>
              <dd className="font-display tabular-nums text-foreground">
                {formatCurrency(team.transferBudget)}
              </dd>
            </div>
            {transferFee !== '' && transferFee > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="label-mono text-foreground-muted">Indemnité saisie</dt>
                  <dd className="font-display tabular-nums text-foreground">
                    {formatCurrency(Number(transferFee))}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="label-mono text-foreground-muted">Solde après</dt>
                  <dd
                    className="font-display tabular-nums"
                    style={{
                      color: team.transferBudget - Number(transferFee) < 0 ? 'var(--loss)' : 'var(--win)',
                    }}
                  >
                    {formatCurrency(team.transferBudget - Number(transferFee))}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>

        <section className="border-y border-hairline bg-surface p-5 text-xs leading-6 text-foreground-dim">
          <p className="label-mono text-foreground-muted">Rappels</p>
          <ul className="mt-3 list-disc pl-4 space-y-1">
            <li>Le contrat n&apos;est actif qu&apos;après validation admin.</li>
            <li>Une offre ≥ clause libératoire déclenche un transfert automatique.</li>
            <li>La masse salariale ne peut pas dépasser le plafond.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
