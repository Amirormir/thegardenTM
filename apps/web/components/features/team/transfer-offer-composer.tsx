'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { getTransferFloor } from '@/lib/utils/transfer-rules';
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
  releaseClause: number;
}

interface BuyerTeam {
  id: string;
  name: string;
  transferBudget: number;
}

interface TransferOfferComposerProps {
  buyerTeam: BuyerTeam;
  player: Player;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function TransferOfferComposer({ buyerTeam, player }: TransferOfferComposerProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const createOffer = api.transfer.create.useMutation();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const minFee = getTransferFloor(player.marketValue);
  const suggestedFee = Math.max(player.marketValue, minFee, 1);
  const [offeredFee, setOfferedFee] = useState<number>(suggestedFee);
  const [message, setMessage] = useState<string>('');

  const playerDisplayName = player.displayName ?? player.gameName;
  const triggersClause = offeredFee >= player.releaseClause;
  const belowMin = offeredFee < minFee;
  const budgetAfter = buyerTeam.transferBudget - offeredFee;
  const overBudget = budgetAfter < 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    try {
      const result = await createOffer.mutateAsync({
        playerId: player.id,
        fromTeamId: buyerTeam.id,
        offeredFee,
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      await Promise.all([
        utils.transfer.getByTeam.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message:
          result.status === 'ACCEPTED'
            ? 'Clause libératoire déclenchée. Contrat en attente de validation admin.'
            : `Offre envoyée au capitaine de ${player.team?.name ?? "l'équipe"}.`,
      });
      setTimeout(() => router.push('/team'), 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "L'offre a échoué.";
      setFeedback({ type: 'error', message: msg });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/transfermarket/${player.id}`}
          className="inline-flex items-center gap-2 label-mono text-foreground-dim hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au profil
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
          statusLabel="Cible de transfert"
          statusTone="accent"
          contextLabel={player.team?.shortCode ?? null}
        />

        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <header className="flex flex-col gap-3 border-b border-hairline pb-6">
            <p className="label-mono text-accent">Offre de transfert</p>
            <h2 className="display-md text-foreground">Montant proposé</h2>
            <p className="text-sm leading-6 text-foreground-dim">
              Si l&apos;offre atteint la clause libératoire, le transfert est automatique.
            </p>
          </header>

          <div className="flex flex-col gap-3 border-y border-hairline bg-surface px-6 py-6">
            <label className="label-mono text-foreground-muted">Indemnité de transfert</label>
            <Input
              type="number"
              min={minFee}
              value={offeredFee}
              onChange={(e) => setOfferedFee(Math.max(0, Number.parseInt(e.target.value || '0', 10)))}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 font-display !text-4xl tabular-nums !text-foreground focus:!ring-0"
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
              <span className="label-mono text-foreground-muted">
                Clause · {formatCurrency(player.releaseClause)}
              </span>
              <span
                className="font-display tabular-nums"
                style={{ color: triggersClause ? 'var(--win)' : 'var(--foreground-muted)' }}
              >
                {triggersClause ? 'Déclenche le transfert' : 'Sous la clause'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="label-mono text-foreground-muted">
                Minimum · {formatCurrency(minFee)} (valeur marchande)
              </span>
              {belowMin ? (
                <span
                  className="font-display tabular-nums"
                  style={{ color: 'var(--loss)' }}
                >
                  Sous le minimum autorisé
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono text-foreground-muted">Message (optionnel)</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Offre ferme, négociable…"
            />
          </div>

          <div className="flex flex-col gap-2 border-y border-hairline bg-surface px-5 py-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="label-mono text-foreground-muted">Budget transfert disponible</span>
              <span className="font-display tabular-nums text-foreground">
                {formatCurrency(buyerTeam.transferBudget)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-mono text-foreground-muted">Solde après offre</span>
              <span
                className="font-display tabular-nums"
                style={{ color: overBudget ? 'var(--loss)' : 'var(--win)' }}
              >
                {formatCurrency(budgetAfter)}
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
              disabled={createOffer.isPending || overBudget || belowMin}
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
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
