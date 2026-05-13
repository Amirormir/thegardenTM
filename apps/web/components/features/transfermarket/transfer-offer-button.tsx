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
      <div className="space-y-3">
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
              'border-l-2 px-4 py-3 text-sm',
              feedback.type === 'success'
                ? 'border-l-[color:var(--win)] bg-surface text-foreground'
                : 'border-l-[color:var(--loss)] bg-surface text-foreground',
            )}
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface p-6 space-y-5">
      <div>
        <p className="label-mono">§ Offre de transfert</p>
        <h3 className="mt-2 display-md text-foreground">{playerName}</h3>
      </div>
      <p className="text-sm leading-6 text-foreground-dim">
        Clause liberatoire{' '}
        <span className="font-display tabular-nums text-foreground">
          {formatCurrency(releaseClause)}
        </span>
        . Si votre offre atteint ce montant, le transfert est automatique.
      </p>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Montant de l&apos;offre *</span>
          <Input
            name="offeredFee"
            type="number"
            min={0}
            required
            placeholder={`Min. suggeree: ${releaseClause}`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Message (optionnel)</span>
          <Input name="message" placeholder="Ex: Offre ferme, negociable..." />
        </label>
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
            Envoyer l&apos;offre
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>

      {feedback ? (
        <div
          className={cn(
            'border-l-2 px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-l-[color:var(--win)] bg-background text-foreground'
              : 'border-l-[color:var(--loss)] bg-background text-foreground',
          )}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
