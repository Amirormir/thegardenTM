'use client';

import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface TransferOfferButtonProps {
  playerId: string;
  playerName: string;
  releaseClause: number;
  buyerTeamId: string;
}

export function TransferOfferButton({
  playerId,
  playerName,
  releaseClause,
  buyerTeamId,
}: TransferOfferButtonProps) {
  const utils = api.useUtils();
  const createOffer = api.transfer.create.useMutation();

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const offeredFee = Number.parseInt(formData.get('offeredFee') as string, 10);
    const message = (formData.get('message') as string)?.trim() || undefined;

    try {
      const result = await createOffer.mutateAsync({
        playerId,
        fromTeamId: buyerTeamId,
        offeredFee,
        message,
      });

      form.reset();
      setOpen(false);
      await Promise.all([
        utils.transfer.getByTeam.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
      ]);

      if (result.status === 'ACCEPTED') {
        setFeedback({
          type: 'success',
          message: `Clause liberatoire declenchee ! Le contrat est en attente de validation admin.`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Offre envoyee au capitaine de l'equipe de ${playerName}.`,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "L'offre a echoue.";
      setFeedback({ type: 'error', message: msg });
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<ArrowRightLeft className="h-4 w-4" />}
          onClick={() => { setOpen(true); setFeedback(null); }}
        >
          Faire une offre
        </Button>
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
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-accent-primary/20 bg-accent-primary/5 p-5 space-y-4">
      <h3 className="font-display text-lg font-bold tracking-tight text-white">
        Offre de transfert — {playerName}
      </h3>
      <p className="text-sm text-text-secondary">
        Clause liberatoire : <span className="font-display tabular-nums text-white">{formatCurrency(releaseClause)}</span>.
        Si votre offre atteint ce montant, le transfert est automatique.
      </p>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Montant de l'offre *
          </label>
          <Input
            name="offeredFee"
            type="number"
            min={0}
            required
            placeholder={`Min. suggeree: ${releaseClause}`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Message (optionnel)
          </label>
          <Input name="message" placeholder="Ex: Offre ferme, negociable..." />
        </div>
        <div className="flex gap-3 md:col-span-2">
          <Button
            type="submit"
            disabled={createOffer.isPending}
            icon={
              createOffer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )
            }
          >
            Envoyer l'offre
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>

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
    </div>
  );
}
