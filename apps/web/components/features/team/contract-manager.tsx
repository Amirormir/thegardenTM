'use client';

import { Clock, FileText, Loader2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
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
import { buildPlayerRiotId } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'En attente',
  ACTIVE: 'Actif',
  EXPIRED: 'Expire',
  TERMINATED: 'Rompu',
  LOAN: 'Pret',
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
        'rounded-2xl border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
          : 'border-rose-400/20 bg-rose-500/10 text-rose-100',
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
  const terminateContract = api.contract.terminate.useMutation();
  const renewContract = api.contract.renew.useMutation();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
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
        message: 'Le contrat a ete soumis. Il sera actif apres validation par un admin.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La creation a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleTerminate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!terminatingId) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await terminateContract.mutateAsync({
        id: terminatingId,
        reason: (formData.get('reason') as string)?.trim() || undefined,
      });
      form.reset();
      setTerminatingId(null);
      await Promise.all([
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({ type: 'success', message: 'Le contrat a ete rompu.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La rupture a echoue.';
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
        message: 'Renouvellement soumis. Le nouveau contrat sera actif apres validation admin.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le renouvellement a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  const mutationPending = createContract.isPending || terminateContract.isPending || renewContract.isPending;

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-kicker">Contract management</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Contrats</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Tout contrat cree sera soumis a validation admin avant activation.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => { setShowCreateForm(true); setTerminatingId(null); }}
        >
          Nouveau contrat
        </Button>
      </div>

      <FeedbackBanner feedback={feedback} />

      {showCreateForm ? (
        <div className="rounded-3xl border border-white/8 bg-white/5 p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-white">Proposer un contrat</h3>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Joueur</label>
              <Select name="playerId" required defaultValue="">
                <option value="" disabled>Choisir un joueur</option>
                {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                    {player.displayName} - {buildPlayerRiotId(player)} ({player.role}){player.teamId ? ' - roster actuel' : ' - free agent'}
                    </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Salaire</label>
              <Input name="salary" type="number" min={0} required placeholder="Ex: 150000" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Duree (nombre de BO3)</label>
              <Input name="durationBo3" type="number" min={1} required placeholder="Ex: 10" />
              <p className="text-xs text-text-secondary">
                Le contrat expire apres ce nombre de BO3 joues.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Clause liberatoire *</label>
              <Input name="releaseClause" type="number" min={1} required placeholder="Obligatoire" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Frais de transfert</label>
              <Input name="transferFee" type="number" min={0} placeholder="Optionnel" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Notes</label>
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
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des contrats...
        </div>
      ) : contracts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Salaire</TableHead>
              <TableHead>Duree</TableHead>
              <TableHead>Clause</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
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
                  {contract.status === 'PENDING_APPROVAL' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/14 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-100 ring-1 ring-amber-400/24">
                      <Clock className="h-3 w-3" />
                      En attente
                    </span>
                  ) : (
                    <Badge variant={statusBadgeVariant(contract.status)}>
                      {STATUS_LABEL[contract.status] ?? contract.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">{formatCurrency(contract.salary)}</TableCell>
                <TableCell>{contract.durationBo3} BO3</TableCell>
                <TableCell className="font-mono">{formatCurrency(contract.releaseClause)}</TableCell>
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
                          setTerminatingId(null);
                          setShowCreateForm(false);
                        }}
                        disabled={mutationPending}
                      >
                        Renouveler
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => { setTerminatingId(contract.id); setShowCreateForm(false); setRenewingContract(null); }}
                        disabled={mutationPending}
                      >
                        Rompre
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-secondary">--</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
          Aucun contrat enregistre pour cette equipe.
        </div>
      )}

      {renewingContract ? (
        <div className="rounded-3xl border border-violet-400/20 bg-violet-500/8 p-5 space-y-4">
          <div>
            <h3 className="font-display text-xl font-bold text-violet-100">
              Renouveler le contrat
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Joueur :{' '}
              <PlayerLink playerId={renewingContract.playerId} className="font-semibold text-white">
                {renewingContract.playerName}
              </PlayerLink>
              {' '}— l'ancien contrat sera expire et le nouveau soumis a validation admin.
            </p>
          </div>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRenew}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Nouveau salaire *
              </label>
              <Input
                name="salary"
                type="number"
                min={0}
                required
                defaultValue={renewingContract.salary}
                placeholder="Ex: 150000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Duree (nombre de BO3) *
              </label>
              <Input
                name="durationBo3"
                type="number"
                min={1}
                required
                defaultValue={renewingContract.durationBo3}
                placeholder="Ex: 10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Clause liberatoire *
              </label>
              <Input
                name="releaseClause"
                type="number"
                min={1}
                required
                defaultValue={renewingContract.releaseClause}
                placeholder="Obligatoire"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Frais de transfert
              </label>
              <Input name="transferFee" type="number" min={0} placeholder="Optionnel" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Notes
              </label>
              <Input name="notes" placeholder="Ex: Prolongation suite a bonne saison..." />
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

      {terminatingId ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/8 p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-rose-100">Rompre le contrat</h3>
          <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleTerminate}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Motif (optionnel)</label>
              <Input name="reason" placeholder="Ex: Fin de saison, transfert..." />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                variant="danger"
                disabled={mutationPending}
                icon={mutationPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              >
                Confirmer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setTerminatingId(null)}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
