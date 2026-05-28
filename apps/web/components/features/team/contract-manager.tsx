'use client';

import { Clock, FileText, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { buildPlayerRiotId } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'En attente',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  TERMINATED: 'Rompu',
  LOAN: 'Prêt',
};

function statusBadgeVariant(status: string): 'actif' | 'expiré' {
  if (status === 'ACTIVE' || status === 'LOAN') return 'actif';
  return 'expiré';
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;
  return (
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
  );
}

interface ContractManagerProps {
  teamId: string;
}

export function ContractManager({ teamId }: ContractManagerProps) {
  const utils = api.useUtils();
  const contractsQuery = api.contract.getByTeam.useQuery({ teamId });
  const playersQuery = api.player.getAll.useQuery({});

  const createContract = api.contract.create.useMutation();
  const renewContract = api.contract.renew.useMutation();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [renewingContract, setRenewingContract] = useState<{
    id: string;
    playerId: string;
    salary: number;
    durationBo3: number;
    releaseClause: number;
    playerName: string;
  } | null>(null);

  const contracts = contractsQuery.data ?? [];
  const players = playersQuery.data ?? [];
  const availablePlayers = players.filter(
    (player) => !player.teamId || player.teamId === teamId,
  );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const salary = Number.parseInt(formData.get('salary') as string, 10);
    const durationBo3 = Number.parseInt(formData.get('durationBo3') as string, 10);
    const releaseClause = Number.parseInt(formData.get('releaseClause') as string, 10);
    const transferFee = formData.get('transferFee') as string;

    try {
      await createContract.mutateAsync({
        playerId: formData.get('playerId') as string,
        teamId,
        salary,
        durationBo3,
        releaseClause,
        ...(transferFee ? { transferFee: Number.parseInt(transferFee, 10) } : {}),
        ...((formData.get('notes') as string)?.trim()
          ? { notes: (formData.get('notes') as string).trim() }
          : {}),
      });
      form.reset();
      setShowCreateForm(false);
      await Promise.all([
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: 'Le contrat a été soumis. Il sera actif après validation par un admin.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La création a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleRenew(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renewingContract) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const salary = Number.parseInt(formData.get('salary') as string, 10);
    const durationBo3 = Number.parseInt(formData.get('durationBo3') as string, 10);
    const releaseClause = Number.parseInt(formData.get('releaseClause') as string, 10);
    const transferFeeRaw = formData.get('transferFee') as string;
    const notesRaw = (formData.get('notes') as string)?.trim();

    try {
      await renewContract.mutateAsync({
        id: renewingContract.id,
        salary,
        durationBo3,
        releaseClause,
        ...(transferFeeRaw ? { transferFee: Number.parseInt(transferFeeRaw, 10) } : {}),
        ...(notesRaw ? { notes: notesRaw } : {}),
      });
      form.reset();
      setRenewingContract(null);
      await Promise.all([
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: 'Renouvellement soumis. Le nouveau contrat sera actif après validation admin.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le renouvellement a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  const mutationPending = createContract.isPending || renewContract.isPending;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <p className="label-mono">§ Contrats</p>
          <h2 className="mt-3 display-md text-foreground">Gestion contractuelle.</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
            Tout contrat créé sera soumis à validation admin avant activation.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => { setShowCreateForm(true); setRenewingContract(null); }}
        >
          Nouveau contrat
        </Button>
      </div>

      <FeedbackBanner feedback={feedback} />

      {showCreateForm ? (
        <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-accent">Proposer un contrat</p>
          <form className="mt-5 grid gap-5 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Joueur</label>
              <Select name="playerId" required defaultValue="">
                <option value="" disabled>Choisir un joueur</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName} — {buildPlayerRiotId(player)} ({player.role}){player.teamId ? ' · roster actuel' : ' · free agent'}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Salaire</label>
              <Input name="salary" type="number" min={0} required placeholder="Ex: 150000" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Durée (nombre de BO3)</label>
              <Input name="durationBo3" type="number" min={1} required placeholder="Ex: 10" />
              <p className="text-xs leading-6 text-foreground-muted">
                Le contrat expire après ce nombre de BO3 joués.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Clause libératoire *</label>
              <Input name="releaseClause" type="number" min={1} required placeholder="Obligatoire" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Frais de transfert</label>
              <Input name="transferFee" type="number" min={0} placeholder="Optionnel" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Notes</label>
              <Input name="notes" placeholder="Optionnel" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button
                type="submit"
                disabled={mutationPending}
                icon={mutationPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              >
                Soumettre
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {contractsQuery.isLoading ? (
        <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-4 label-mono text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des contrats…
        </div>
      ) : contracts.length > 0 ? (
        <div className="border-t border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>BO restants</TableHead>
                <TableHead>Clause</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <PlayerLink playerId={contract.player.id} className="font-display text-foreground">
                      {contract.player.displayName}
                    </PlayerLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contract.player.role}>{contract.player.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {contract.status === 'PENDING_APPROVAL' ? (
                      <span className="inline-flex items-center gap-1.5 label-mono text-accent">
                        <Clock className="h-3 w-3" />
                        En attente
                      </span>
                    ) : (
                      <Badge variant={statusBadgeVariant(contract.status)}>
                        {STATUS_LABEL[contract.status] ?? contract.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-display tabular-nums">{formatCurrency(contract.salary)}</TableCell>
                  <TableCell className="label-mono tabular-nums">{contract.durationBo3} BO</TableCell>
                  <TableCell className="label-mono tabular-nums">
                    {contract.status === 'ACTIVE' || contract.status === 'LOAN' ? (
                      contract.bosRemaining != null ? (
                        <span
                          className={cn(
                            contract.bosRemaining <= 2 ? 'text-[color:var(--loss)]' : 'text-foreground',
                          )}
                        >
                          {contract.bosRemaining} / {contract.durationBo3}
                        </span>
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )
                    ) : (
                      <span className="text-foreground-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-display tabular-nums">{formatCurrency(contract.releaseClause)}</TableCell>
                  <TableCell>
                    {contract.status === 'ACTIVE' || contract.status === 'LOAN' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={<RefreshCw className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setRenewingContract({
                              id: contract.id,
                              playerId: contract.player.id,
                              salary: contract.salary,
                              durationBo3: contract.durationBo3,
                              releaseClause: contract.releaseClause,
                              playerName: contract.player.displayName,
                            });
                            setShowCreateForm(false);
                          }}
                          disabled={mutationPending}
                        >
                          Renouveler
                        </Button>
                      </div>
                    ) : (
                      <span className="label-mono text-foreground-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border border-hairline bg-surface px-5 py-4 label-mono text-foreground-dim">
          Aucun contrat enregistré pour cette équipe.
        </div>
      )}

      {renewingContract ? (
        <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-accent">Renouveler le contrat</p>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Joueur ·{' '}
            <PlayerLink playerId={renewingContract.playerId} className="font-display text-foreground">
              {renewingContract.playerName}
            </PlayerLink>
            {' '}— l&apos;ancien contrat sera expiré et le nouveau soumis à validation admin.
          </p>
          <form className="mt-5 grid gap-5 md:grid-cols-2" onSubmit={handleRenew}>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Nouveau salaire *</label>
              <Input
                name="salary"
                type="number"
                min={0}
                required
                defaultValue={renewingContract.salary}
                placeholder="Ex: 150000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Durée (nombre de BO3) *</label>
              <Input
                name="durationBo3"
                type="number"
                min={1}
                required
                defaultValue={renewingContract.durationBo3}
                placeholder="Ex: 10"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Clause libératoire *</label>
              <Input
                name="releaseClause"
                type="number"
                min={1}
                required
                defaultValue={renewingContract.releaseClause}
                placeholder="Obligatoire"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Frais de transfert</label>
              <Input name="transferFee" type="number" min={0} placeholder="Optionnel" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="label-mono">Notes</label>
              <Input name="notes" placeholder="Ex: Prolongation suite à bonne saison…" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button
                type="submit"
                disabled={mutationPending}
                icon={
                  renewContract.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )
                }
              >
                Soumettre le renouvellement
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRenewingContract(null)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : null}

    </div>
  );
}
