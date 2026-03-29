'use client';

import { ArrowRightLeft, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ACCEPTED: 'Accepte',
  REJECTED: 'Refuse',
  CANCELLED: 'Annule',
  COMPLETED: 'Finalise',
};

function statusColor(status: string) {
  if (status === 'ACCEPTED' || status === 'COMPLETED') return 'text-emerald-400';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'text-rose-400';
  if (status === 'COUNTER_PROPOSED') return 'text-violet-400';
  return 'text-amber-400';
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
      setFeedback({ type: 'success', message: 'Offre acceptee. Le contrat est en attente de validation admin.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'acceptation a echoue.";
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
      setFeedback({ type: 'success', message: 'Offre refusee.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le rejet a echoue.';
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
      setFeedback({ type: 'success', message: 'Contre-offre envoyee.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'envoi de la contre-offre a echoue.";
      setFeedback({ type: 'error', message });
    }
  }

  async function handleCancel(id: string) {
    setFeedback(null);
    try {
      await cancelMutation.mutateAsync({ id });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Offre annulee.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'annulation a echoue.";
      setFeedback({ type: 'error', message });
    }
  }

  const hasData = incoming.length > 0 || outgoing.length > 0;
  const isLoading = incomingQuery.isLoading || outgoingQuery.isLoading;

  return (
    <Card className="space-y-5">
      <div>
        <p className="text-kicker">Transfer market</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-white">Offres de transfert</h2>
      </div>

      {feedback ? (
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
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : !hasData ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
          <ArrowRightLeft className="h-4 w-4" />
          Aucune offre de transfert.
        </div>
      ) : null}

      {incoming.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            Offres recues ({incoming.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Role</TableHead>
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
                  <TableCell className="font-semibold text-white">
                    {offer.player.gameName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.player.role}>{offer.player.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-text-secondary">
                      {offer.fromTeam.shortCode}
                    </span>{' '}
                    {offer.fromTeam.name}
                  </TableCell>
                  <TableCell className="font-mono">
                    <div>{formatCurrency(offer.offeredFee)}</div>
                    {'counterOffer' in offer && offer.counterOffer != null ? (
                      <div className="text-xs text-violet-400">
                        Contre: {formatCurrency(offer.counterOffer as number)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs font-semibold uppercase', statusColor(offer.status))}>
                      {STATUS_LABEL[offer.status] ?? offer.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
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
                      <span className="text-xs text-text-secondary">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            Offres envoyees ({outgoing.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Role</TableHead>
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
                  <TableCell className="font-semibold text-white">
                    {offer.player.gameName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.player.role}>{offer.player.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-text-secondary">
                      {offer.toTeam.shortCode}
                    </span>{' '}
                    {offer.toTeam.name}
                  </TableCell>
                  <TableCell className="font-mono">
                    <div>{formatCurrency(offer.offeredFee)}</div>
                    {'counterOffer' in offer && offer.counterOffer != null ? (
                      <div className="text-xs text-violet-400">
                        Contre: {formatCurrency(offer.counterOffer as number)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs font-semibold uppercase', statusColor(offer.status))}>
                      {STATUS_LABEL[offer.status] ?? offer.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
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
                      <span className="text-xs text-text-secondary">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {counterProposingId ? (
        <div className="rounded-3xl border border-violet-400/20 bg-violet-500/8 p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-violet-100">Contre-proposer</h3>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCounterPropose}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Montant souhaite *
              </label>
              <Input
                name="counterOffer"
                type="number"
                min={1}
                placeholder="Ex: 500000"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Message (optionnel)
              </label>
              <Input name="counterMessage" placeholder="Ex: Joueur cle, prix minimal..." />
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
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/8 p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-rose-100">Refuser l'offre</h3>
          <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleReject}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Motif (optionnel)
              </label>
              <Input name="reason" placeholder="Ex: Offre trop basse, joueur cle..." />
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
    </Card>
  );
}
