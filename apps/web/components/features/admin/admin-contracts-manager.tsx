'use client';

import { CheckCircle2, Clock, Filter, Loader2, Scissors, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlayerLink } from '@/components/ui/player-link';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function AdminContractsManager() {
  const utils = api.useUtils();
  const pendingQuery = api.contract.getPendingApprovals.useQuery();
  const activeQuery = api.contract.adminListActive.useQuery();
  const teamsQuery = api.team.getAll.useQuery();
  const approveMutation = api.contract.approve.useMutation();
  const rejectMutation = api.contract.reject.useMutation();
  const adminTerminateMutation = api.contract.adminTerminate.useMutation();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [terminateReason, setTerminateReason] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [activeTeamFilter, setActiveTeamFilter] = useState<string>('');

  const allPending = pendingQuery.data ?? [];
  const allActive = activeQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const pending = useMemo(
    () => teamFilter ? allPending.filter((c) => c.team.id === teamFilter) : allPending,
    [allPending, teamFilter],
  );
  const active = useMemo(
    () => activeTeamFilter ? allActive.filter((c) => c.team.id === activeTeamFilter) : allActive,
    [allActive, activeTeamFilter],
  );
  const mutationPending =
    approveMutation.isPending || rejectMutation.isPending || adminTerminateMutation.isPending;

  const terminatingContract = useMemo(
    () => allActive.find((c) => c.id === terminatingId) ?? null,
    [allActive, terminatingId],
  );

  function openTerminate(contractId: string) {
    const contract = allActive.find((c) => c.id === contractId);
    if (!contract) return;
    setTerminatingId(contractId);
    setRefundAmount(String(contract.transferFee ?? 0));
    setTerminateReason('');
    setFeedback(null);
  }

  function closeTerminate() {
    setTerminatingId(null);
    setRefundAmount('');
    setTerminateReason('');
  }

  async function handleApprove(id: string) {
    setFeedback(null);
    try {
      await approveMutation.mutateAsync({ id });
      await Promise.all([
        utils.contract.getPendingApprovals.invalidate(),
        utils.contract.adminListActive.invalidate(),
        utils.team.getAll.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({ type: 'success', message: 'Contrat approuve. Le joueur a rejoint le roster.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'approbation a echoue.";
      setFeedback({ type: 'error', message });
    }
  }

  async function handleReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectingId) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await rejectMutation.mutateAsync({
        id: rejectingId,
        reason: (formData.get('reason') as string)?.trim() || undefined,
      });
      form.reset();
      setRejectingId(null);
      await utils.contract.getPendingApprovals.invalidate();
      setFeedback({ type: 'success', message: 'Contrat rejete.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le rejet a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleTerminate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!terminatingId) return;
    setFeedback(null);

    const parsed = Number.parseInt(refundAmount, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setFeedback({ type: 'error', message: 'Montant de remboursement invalide.' });
      return;
    }

    try {
      const result = await adminTerminateMutation.mutateAsync({
        id: terminatingId,
        refundAmount: parsed,
        reason: terminateReason.trim() || undefined,
      });
      await Promise.all([
        utils.contract.adminListActive.invalidate(),
        utils.team.getAll.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      closeTerminate();
      setFeedback({
        type: 'success',
        message: `Contrat rompu. ${formatCurrency(result.refundAmount)} rendus a l'equipe.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La rupture a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-mono">Validation</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              Contrats en attente
            </h2>
            <p className="mt-1 text-sm text-foreground-dim">
              Les contrats soumis par les capitaines doivent etre approuves avant activation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground-dim" />
            <Select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-52"
            >
              <option value="">Toutes les equipes</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortCode} — {team.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {feedback ? (
          <div
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm',
              feedback.type === 'success'
                ? 'border-emerald-400/20 bg-emerald-500/10 text-[color:var(--win)]'
                : 'border-rose-400/20 bg-rose-500/10 text-[color:var(--loss)]',
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        {pendingQuery.isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : pending.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>Duree</TableHead>
                <TableHead>Clause</TableHead>
                <TableHead>Transfert</TableHead>
                <TableHead>Marge salariale</TableHead>
                <TableHead>Soumis le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((contract) => {
                const budgetRemaining = contract.team.salaryBudgetCap - contract.salary;
                const budgetDanger = budgetRemaining < 0;

                return (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <PlayerLink playerId={contract.player.id} className="font-semibold text-white">
                        {contract.player.displayName}
                      </PlayerLink>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contract.player.role}>{contract.player.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-display tabular-nums text-xs text-foreground-dim">
                        {contract.team.shortCode}
                      </span>{' '}
                      {contract.team.name}
                    </TableCell>
                    <TableCell className="font-display tabular-nums">
                      {formatCurrency(contract.salary)}
                    </TableCell>
                    <TableCell>{contract.durationBo3} BO3</TableCell>
                    <TableCell className="font-display tabular-nums">
                      {formatCurrency(contract.releaseClause)}
                    </TableCell>
                    <TableCell className="font-display tabular-nums">
                      {contract.transferFee != null
                        ? formatCurrency(contract.transferFee)
                        : '--'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-display tabular-nums',
                          budgetDanger ? 'text-[color:var(--loss)]' : 'text-[color:var(--win)]',
                        )}
                      >
                        {formatCurrency(budgetRemaining)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground-dim">
                      {formatDateTime(contract.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          icon={
                            approveMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )
                          }
                          disabled={mutationPending}
                          onClick={() => handleApprove(contract.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                          disabled={mutationPending}
                          onClick={() => setRejectingId(contract.id)}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
            <Clock className="h-4 w-4" />
            Aucun contrat en attente de validation.
          </div>
        )}

        {rejectingId ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/8 p-5 space-y-4">
            <h3 className="font-display text-xl font-bold tracking-tight text-[color:var(--loss)]">Rejeter le contrat</h3>
            <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleReject}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Motif (optionnel)
                </label>
                <Input name="reason" placeholder="Ex: Budget insuffisant, doublon..." />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  variant="danger"
                  disabled={mutationPending}
                  icon={
                    rejectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )
                  }
                >
                  Confirmer le rejet
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRejectingId(null)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-mono">Rupture admin</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              Contrats actifs
            </h2>
            <p className="mt-1 text-sm text-foreground-dim">
              Rompre un contrat libere le joueur et rembourse l&apos;equipe sur son budget transfert.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground-dim" />
            <Select
              value={activeTeamFilter}
              onChange={(e) => setActiveTeamFilter(e.target.value)}
              className="w-52"
            >
              <option value="">Toutes les equipes</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortCode} — {team.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {activeQuery.isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : active.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>BO restants</TableHead>
                <TableHead>Transfert</TableHead>
                <TableHead>Approuve le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <PlayerLink playerId={contract.player.id} className="font-semibold text-white">
                      {contract.player.displayName}
                    </PlayerLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contract.player.role}>{contract.player.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-display tabular-nums text-xs text-foreground-dim">
                      {contract.team.shortCode}
                    </span>{' '}
                    {contract.team.name}
                  </TableCell>
                  <TableCell>
                    <span className="label-mono text-xs">
                      {contract.status === 'LOAN' ? 'Pret' : 'Actif'}
                    </span>
                  </TableCell>
                  <TableCell className="font-display tabular-nums">
                    {formatCurrency(contract.salary)}
                  </TableCell>
                  <TableCell className="label-mono tabular-nums">
                    {contract.bosRemaining != null
                      ? `${contract.bosRemaining} / ${contract.durationBo3}`
                      : '--'}
                  </TableCell>
                  <TableCell className="font-display tabular-nums">
                    {contract.transferFee != null
                      ? formatCurrency(contract.transferFee)
                      : '--'}
                  </TableCell>
                  <TableCell className="text-xs text-foreground-dim">
                    {contract.approvedAt ? formatDateTime(contract.approvedAt) : '--'}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={<Scissors className="h-3.5 w-3.5" />}
                      disabled={mutationPending}
                      onClick={() => openTerminate(contract.id)}
                    >
                      Rompre
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
            <Clock className="h-4 w-4" />
            Aucun contrat actif.
          </div>
        )}

        {terminatingId && terminatingContract ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/8 p-5 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[color:var(--loss)]">
                Rompre le contrat de {terminatingContract.player.displayName}
              </h3>
              <p className="mt-1 text-xs text-foreground-dim">
                Equipe : {terminatingContract.team.name} — Budget transfert actuel :{' '}
                <span className="font-display tabular-nums">
                  {formatCurrency(terminatingContract.team.transferBudget)}
                </span>
              </p>
            </div>
            <form className="grid gap-4 md:grid-cols-[180px_1fr_auto]" onSubmit={handleTerminate}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Remboursement
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Motif (optionnel)
                </label>
                <Input
                  value={terminateReason}
                  onChange={(event) => setTerminateReason(event.target.value)}
                  placeholder="Ex: Annulation transfert, sanction..."
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  variant="danger"
                  disabled={mutationPending}
                  icon={
                    adminTerminateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scissors className="h-4 w-4" />
                    )
                  }
                >
                  Confirmer la rupture
                </Button>
                <Button type="button" variant="secondary" onClick={closeTerminate}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
