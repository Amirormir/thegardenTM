'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

interface FreeAgentSignButtonProps {
  playerId: string;
  playerName: string;
  teamId: string;
}

export function FreeAgentSignButton({
  playerId,
  playerName,
  teamId,
}: FreeAgentSignButtonProps) {
  const utils = api.useUtils();
  const createContract = api.contract.create.useMutation();

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const salary = Number.parseInt(formData.get('salary') as string, 10);
    const durationBo3 = Number.parseInt(formData.get('durationBo3') as string, 10);
    const releaseClause = Number.parseInt(formData.get('releaseClause') as string, 10);
    const notesRaw = (formData.get('notes') as string)?.trim();

    try {
      await createContract.mutateAsync({
        playerId,
        teamId,
        salary,
        durationBo3,
        releaseClause,
        ...(notesRaw ? { notes: notesRaw } : {}),
      });
      form.reset();
      setOpen(false);
      await Promise.all([
        utils.contract.getByTeam.invalidate(),
        utils.team.getById.invalidate(),
        utils.player.getAll.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: `Contrat soumis pour ${playerName}. En attente de validation admin.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'La signature a echoue.';
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
          icon={<FileText className="h-4 w-4" />}
          onClick={() => { setOpen(true); setFeedback(null); }}
        >
          Signer ce free agent
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
    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5 space-y-4">
      <h3 className="font-display text-lg font-bold tracking-tight text-white">
        Signer le free agent — {playerName}
      </h3>
      <p className="text-sm text-text-secondary">
        Ce joueur est libre. Proposez un contrat directement — il sera soumis a validation admin.
      </p>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Salaire *
          </label>
          <Input name="salary" type="number" min={0} required placeholder="Ex: 150000" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Duree (nombre de BO3) *
          </label>
          <Input name="durationBo3" type="number" min={1} required placeholder="Ex: 10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Clause liberatoire *
          </label>
          <Input name="releaseClause" type="number" min={1} required placeholder="Obligatoire" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
            Notes
          </label>
          <Input name="notes" placeholder="Optionnel" />
        </div>
        <div className="flex gap-3 md:col-span-2">
          <Button
            type="submit"
            disabled={createContract.isPending}
            icon={
              createContract.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )
            }
          >
            Soumettre le contrat
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
