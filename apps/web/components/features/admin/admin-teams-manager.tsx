'use client';

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface TeamDraft {
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string;
  transferBudget: string;
  salaryBudgetCap: string;
}

function createEmptyDraft(): TeamDraft {
  return {
    name: '',
    slug: '',
    shortCode: '',
    logoUrl: '',
    transferBudget: '1200000',
    salaryBudgetCap: '1200000',
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;

  return (
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
  );
}

export function AdminTeamsManager() {
  const utils = api.useUtils();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [draft, setDraft] = useState<TeamDraft>(createEmptyDraft);
  const teamsQuery = api.team.getAll.useQuery();

  const selectedTeamDetailsQuery = api.team.getById.useQuery(
    { id: selectedTeamId ?? '__new__' },
    {
      enabled: Boolean(selectedTeamId),
      staleTime: 30_000,
    },
  );

  const createTeam = api.team.create.useMutation();
  const updateTeam = api.team.update.useMutation();
  const deleteTeam = api.team.delete.useMutation();

  const teams = teamsQuery.data ?? [];
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const payroll = selectedTeamDetailsQuery.data?.players.reduce(
    (sum, player) => sum + player.salary,
    0,
  ) ?? 0;
  const parsedSalaryCap = Number.parseInt(draft.salaryBudgetCap, 10);
  const parsedTransferBudget = Number.parseInt(draft.transferBudget, 10);
  const salaryCapPreview = Number.isFinite(parsedSalaryCap)
    ? parsedSalaryCap
    : (selectedTeamDetailsQuery.data?.salaryBudgetCap ?? 0);
  const transferBudgetPreview = Number.isFinite(parsedTransferBudget)
    ? parsedTransferBudget
    : (selectedTeamDetailsQuery.data?.transferBudget ?? 0);
  const remainingSalaryCap = salaryCapPreview - payroll;

  function selectTeam(teamId: string) {
    const team = teams.find((entry) => entry.id === teamId);

    if (!team) {
      return;
    }

    setSelectedTeamId(teamId);
    setDraft({
      name: team.name,
      slug: team.slug,
      shortCode: team.shortCode,
      logoUrl: team.logoUrl ?? '',
      transferBudget: team.transferBudget.toString(),
      salaryBudgetCap: team.salaryBudgetCap.toString(),
    });
    setFeedback(null);
  }

  function handleNewTeam() {
    setSelectedTeamId(null);
    setDraft(createEmptyDraft());
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const transferBudget = Number.parseInt(draft.transferBudget, 10);
    const salaryBudgetCap = Number.parseInt(draft.salaryBudgetCap, 10);

    try {
      if (selectedTeamId) {
        await updateTeam.mutateAsync({
          id: selectedTeamId,
          name: draft.name,
          slug: draft.slug,
          shortCode: draft.shortCode,
          logoUrl: draft.logoUrl || undefined,
          transferBudget: Number.isFinite(transferBudget) ? transferBudget : undefined,
          salaryBudgetCap: Number.isFinite(salaryBudgetCap) ? salaryBudgetCap : undefined,
        });
        setFeedback({ type: 'success', message: 'Team updated successfully.' });
      } else {
        const created = await createTeam.mutateAsync({
          name: draft.name,
          slug: draft.slug || slugify(draft.name),
          shortCode: draft.shortCode,
          logoUrl: draft.logoUrl || undefined,
          transferBudget: Number.isFinite(transferBudget) ? transferBudget : undefined,
          salaryBudgetCap: Number.isFinite(salaryBudgetCap) ? salaryBudgetCap : undefined,
        });
        setSelectedTeamId(created.id);
        setFeedback({ type: 'success', message: 'Team created successfully.' });
      }

      await Promise.all([
        utils.team.getAll.invalidate(),
        utils.team.getById.invalidate(),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The operation failed.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleDelete() {
    if (!selectedTeamId) return;
    if (!window.confirm('Delete this team? This action cannot be undone.')) return;

    setFeedback(null);

    try {
      await deleteTeam.mutateAsync({ id: selectedTeamId });
      setSelectedTeamId(null);
      setDraft(createEmptyDraft());
      await Promise.all([
        utils.team.getAll.invalidate(),
        utils.team.getById.invalidate(),
      ]);
      setFeedback({ type: 'success', message: 'Team deleted successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed.';
      setFeedback({ type: 'error', message });
    }
  }

  const mutationPending =
    createTeam.isPending || updateTeam.isPending || deleteTeam.isPending;

  return (
    <div className="space-y-8">
      <FeedbackBanner feedback={feedback} />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="space-y-5 xl:sticky xl:top-8 xl:h-fit">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="label-mono">Registry</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Teams</h2>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={handleNewTeam}
            >
              New
            </Button>
          </div>

          <div className="space-y-3">
            {teamsQuery.isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading teams...
              </div>
            ) : teams.length > 0 ? (
              teams.map((team) => {
                const active = team.id === selectedTeamId;

                return (
                  <button
                    key={team.id}
                    type="button"
                    className={cn(
                      'w-full rounded-3xl border p-4 text-left transition',
                      active
                        ? 'border-accent/40 bg-accent/12 shadow-[0_0_30px_rgba(124,58,237,0.12)]'
                        : 'border-white/[0.05] bg-white/[0.035] hover:border-accent/18 hover:bg-white/7',
                    )}
                    onClick={() => selectTeam(team.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{team.name}</p>
                        <p className="mt-1 text-sm text-foreground-dim">
                          {team.shortCode} - {team._count.players} players
                        </p>
                      </div>
                      <Badge variant="actif">{formatCurrency(team.salaryBudgetCap)}</Badge>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-foreground-dim">
                No teams registered yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-6">
          <div>
            <p className="label-mono">Team editor</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              {selectedTeamId ? 'Edit team' : 'Create team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-foreground-dim">
              Assign the captain, update the live budget cap, and preview how much room is left
              against the current payroll before saving.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Name
                </label>
                <Input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: slugify(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Slug
                </label>
                <Input
                  required
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, slug: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Short code
                </label>
                <Input
                  required
                  maxLength={8}
                  value={draft.shortCode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      shortCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Masse salariale max
                </label>
                <Input
                  type="number"
                  min={0}
                  value={draft.salaryBudgetCap}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, salaryBudgetCap: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Budget transfert
                </label>
                <Input
                  type="number"
                  min={0}
                  value={draft.transferBudget}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, transferBudget: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Logo URL
                </label>
                <Input
                  placeholder="https://..."
                  value={draft.logoUrl}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, logoUrl: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Masse salariale actuelle
                </p>
                <p className="mt-2 font-display tabular-nums text-2xl font-semibold text-white">
                  {formatCurrency(payroll)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Marge salariale
                </p>
                <p
                  className={cn(
                    'mt-2 font-display tabular-nums text-2xl font-semibold',
                    remainingSalaryCap >= 0 ? 'text-white' : 'text-[color:var(--loss)]',
                  )}
                >
                  {formatCurrency(remainingSalaryCap)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                  Budget transfert
                </p>
                <p className="mt-2 font-display tabular-nums text-2xl font-semibold text-white">
                  {formatCurrency(transferBudgetPreview)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={mutationPending}
                icon={
                  mutationPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )
                }
              >
                {selectedTeamId ? 'Save changes' : 'Create team'}
              </Button>

              {selectedTeamId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={mutationPending}
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </form>

          {selectedTeam ? (
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-3 text-sm text-foreground-dim">
              <span className="font-semibold text-white">
                {selectedTeam.captains.length > 0
                  ? `Capitaines: ${selectedTeam.captains.map((c) => c.name ?? c.email).join(', ')}`
                  : 'Aucun capitaine'}
              </span>
              {' — '}
              {selectedTeam._count.players} players on the roster.
              {selectedTeam.captains.length === 0 ? (
                <span className="ml-2 text-accent">
                  Assignez des capitaines depuis la page Users.
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
