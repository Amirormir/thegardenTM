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
      <div className="space-y-3">
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
        <p className="label-mono">§ Signature free agent</p>
        <h3 className="mt-2 display-md text-foreground">{playerName}</h3>
      </div>
      <p className="text-sm leading-6 text-foreground-dim">
        Ce joueur est libre. Proposez un contrat directement — il sera soumis a validation admin.
      </p>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Salaire *</span>
          <Input name="salary" type="number" min={0} required placeholder="Ex: 150000" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Duree (BO3) *</span>
          <Input name="durationBo3" type="number" min={1} required placeholder="Ex: 10" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Clause liberatoire *</span>
          <Input name="releaseClause" type="number" min={1} required placeholder="Obligatoire" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Notes</span>
          <Input name="notes" placeholder="Optionnel" />
        </label>
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
