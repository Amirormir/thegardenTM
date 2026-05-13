'use client';

import { ArrowRightLeft, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  COUNTER_PROPOSED: 'Contre-offre',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Finalisée',
};

function statusColor(status: string) {
  if (status === 'ACCEPTED' || status === 'COMPLETED') return 'text-[color:var(--win)]';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'text-[color:var(--loss)]';
  if (status === 'COUNTER_PROPOSED') return 'text-accent';
  return 'text-foreground-dim';
}

interface TransferOffersProps {
  teamId: string;
}

export function TransferOffers({ teamId }: TransferOffersProps) {
  const utils = api.useUtils();
  const incomingQuery = api.transfer.getByTeam.useQuery({ teamId, direction: 'incoming' });
  const outgoingQuery = api.transfer.getByTeam.useQuery({ teamId, direction: 'outgoing' });

  const acceptMutation = api.transfer.accept.useMutation();
  const rejectMutation = api.transfer.reject.useMutation();
  const cancelMutation = api.transfer.cancel.useMutation();
  const counterProposeMutation = api.transfer.counterPropose.useMutation();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [counterProposingId, setCounterProposingId] = useState<string | null>(null);

  const incoming = incomingQuery.data ?? [];
  const outgoing = outgoingQuery.data ?? [];
  const mutationPending =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    counterProposeMutation.isPending;

  async function invalidateAll() {
    await Promise.all([
      utils.transfer.getByTeam.invalidate(),
      utils.contract.getByTeam.invalidate(),
      utils.team.getById.invalidate(),
      utils.player.getAll.invalidate(),
      utils.notification.getUnreadCount.invalidate(),
    ]);
  }

  async function handleAccept(id: string) {
    setFeedback(null);
    try {
      await acceptMutation.mutateAsync({ id });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Offre acceptée. Le contrat est en attente de validation admin.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'acceptation a échoué.";
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
        rejectionReason: (formData.get('reason') as string)?.trim() || undefined,
      });
      form.reset();
      setRejectingId(null);
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Offre refusée.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le rejet a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleCounterPropose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!counterProposingId) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const counterOffer = parseInt(formData.get('counterOffer') as string, 10);
    const counterMessage = (formData.get('counterMessage') as string)?.trim() || undefined;

    if (!counterOffer || isNaN(counterOffer) || counterOffer <= 0) {
      setFeedback({ type: 'error', message: 'Montant de la contre-offre invalide.' });
      return;
    }

    try {
      await counterProposeMutation.mutateAsync({ id: counterProposingId, counterOffer, counterMessage });
      form.reset();
      setCounterProposingId(null);
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Contre-offre envoyée.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'envoi de la contre-offre a échoué.";
      setFeedback({ type: 'error', message });
    }
  }

  async function handleCancel(id: string) {
    setFeedback(null);
    try {
      await cancelMutation.mutateAsync({ id });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Offre annulée.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'annulation a échoué.";
      setFeedback({ type: 'error', message });
    }
  }

  const hasData = incoming.length > 0 || outgoing.length > 0;
  const isLoading = incomingQuery.isLoading || outgoingQuery.isLoading;

  return (
    <div className="flex flex-col gap-8">
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

      {isLoading ? (
        <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-4 label-mono text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : !hasData ? (
        <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-4 label-mono text-foreground-dim">
          <ArrowRightLeft className="h-4 w-4" />
          Aucune offre de transfert.
        </div>
      ) : null}

      {incoming.length > 0 ? (
        <div>
          <p className="label-mono">Offres reçues · {incoming.length.toString().padStart(2, '0')}</p>
          <div className="mt-4 border-t border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incoming.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <PlayerLink playerId={offer.player.id} className="font-display text-foreground">
                        {offer.player.displayName}
                      </PlayerLink>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.player.role}>{offer.player.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="label-mono tabular-nums text-foreground-muted">
                        {offer.fromTeam.shortCode}
                      </span>{' '}
                      <span className="text-foreground-dim">{offer.fromTeam.name}</span>
                    </TableCell>
                    <TableCell className="font-display tabular-nums">
                      <div>{formatCurrency(offer.offeredFee)}</div>
                      {'counterOffer' in offer && offer.counterOffer != null ? (
                        <div className="label-mono text-accent">
                          Contre · {formatCurrency(offer.counterOffer as number)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={cn('label-mono', statusColor(offer.status))}>
                        {STATUS_LABEL[offer.status] ?? offer.status}
                      </span>
                    </TableCell>
                    <TableCell className="label-mono tabular-nums text-foreground-muted">
                      {formatDateTime(offer.createdAt)}
                    </TableCell>
                    <TableCell>
                      {offer.status === 'PENDING' ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            disabled={mutationPending}
                            onClick={() => handleAccept(offer.id)}
                          >
                            Accepter
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                            disabled={mutationPending}
                            onClick={() => { setCounterProposingId(offer.id); setRejectingId(null); }}
                          >
                            Contre
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            icon={<XCircle className="h-3.5 w-3.5" />}
                            disabled={mutationPending}
                            onClick={() => { setRejectingId(offer.id); setCounterProposingId(null); }}
                          >
                            Refuser
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
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div>
          <p className="label-mono">Offres envoyées · {outgoing.length.toString().padStart(2, '0')}</p>
          <div className="mt-4 border-t border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outgoing.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <PlayerLink playerId={offer.player.id} className="font-display text-foreground">
                        {offer.player.displayName}
                      </PlayerLink>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.player.role}>{offer.player.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="label-mono tabular-nums text-foreground-muted">
                        {offer.toTeam.shortCode}
                      </span>{' '}
                      <span className="text-foreground-dim">{offer.toTeam.name}</span>
                    </TableCell>
                    <TableCell className="font-display tabular-nums">
                      <div>{formatCurrency(offer.offeredFee)}</div>
                      {'counterOffer' in offer && offer.counterOffer != null ? (
                        <div className="label-mono text-accent">
                          Contre · {formatCurrency(offer.counterOffer as number)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={cn('label-mono', statusColor(offer.status))}>
                        {STATUS_LABEL[offer.status] ?? offer.status}
                      </span>
                    </TableCell>
                    <TableCell className="label-mono tabular-nums text-foreground-muted">
                      {formatDateTime(offer.createdAt)}
                    </TableCell>
                    <TableCell>
                      {offer.status === 'PENDING' ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                          disabled={mutationPending}
                          onClick={() => handleCancel(offer.id)}
                        >
                          Annuler
                        </Button>
                      ) : offer.status === 'COUNTER_PROPOSED' ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            disabled={mutationPending}
                            onClick={() => handleAccept(offer.id)}
                          >
                            Accepter
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            icon={<XCircle className="h-3.5 w-3.5" />}
                            disabled={mutationPending}
                            onClick={() => { setRejectingId(offer.id); setCounterProposingId(null); }}
                          >
                            Refuser
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
        </div>
      ) : null}

      {counterProposingId ? (
        <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-accent">Contre-proposer</p>
          <form className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCounterPropose}>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Montant souhaité *</label>
              <Input name="counterOffer" type="number" min={1} placeholder="Ex: 500000" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Message (optionnel)</label>
              <Input name="counterMessage" placeholder="Ex: Joueur clé, prix minimal…" />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                disabled={mutationPending}
                icon={
                  counterProposeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )
                }
              >
                Envoyer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCounterProposingId(null)}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {rejectingId ? (
        <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface p-6">
          <p className="label-mono text-[color:var(--loss)]">Refuser l&apos;offre</p>
          <form className="mt-5 grid gap-5 md:grid-cols-[1fr_auto]" onSubmit={handleReject}>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Motif (optionnel)</label>
              <Input name="reason" placeholder="Ex: Offre trop basse, joueur clé…" />
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
                Confirmer le refus
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRejectingId(null)}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
