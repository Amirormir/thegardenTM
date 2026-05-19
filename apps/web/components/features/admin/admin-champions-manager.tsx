'use client';

import { Loader2, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

const PLAYER_ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
type PlayerRole = (typeof PLAYER_ROLES)[number];

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-400/20 bg-emerald-500/10 text-[color:var(--win)]'
          : 'border-rose-400/20 bg-rose-500/10 text-[color:var(--loss)]',
      )}
    >
      {feedback.message}
    </div>
  );
}

export function AdminChampionsManager() {
  const utils = api.useUtils();
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const championsQuery = api.champion.adminList.useQuery();
  const updateChampion = api.champion.update.useMutation();
  const syncChampions = api.champion.syncFromRiot.useMutation();

  const champions = championsQuery.data ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return champions;
    return champions.filter(
      (c) => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query),
    );
  }, [champions, search]);

  const patchVersion = champions[0]?.patchVersion;
  const enabledCount = champions.filter((c) => c.enabled).length;

  async function toggleRole(championId: string, role: PlayerRole, currentRoles: PlayerRole[]) {
    setFeedback(null);
    const next = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    try {
      await updateChampion.mutateAsync({ id: championId, roles: next });
      await utils.champion.adminList.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mise à jour échouée.';
      setFeedback({ type: 'error', message });
    }
  }

  async function toggleEnabled(championId: string, enabled: boolean) {
    setFeedback(null);
    try {
      await updateChampion.mutateAsync({ id: championId, enabled });
      await utils.champion.adminList.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mise à jour échouée.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleSync() {
    setFeedback(null);
    try {
      const result = await syncChampions.mutateAsync({});
      await utils.champion.adminList.invalidate();
      setFeedback({
        type: 'success',
        message: `Sync OK — patch ${result.patchVersion} · ${result.inserted} créés, ${result.updated} mis à jour.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync échouée.';
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="space-y-8">
      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-col gap-4 border-b border-hairline pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="label-mono">Total</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-foreground">
              {champions.length.toString().padStart(3, '0')}
            </p>
          </div>
          <div>
            <p className="label-mono">Activés</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-foreground">
              {enabledCount.toString().padStart(3, '0')}
            </p>
          </div>
          <div>
            <p className="label-mono">Patch</p>
            <p className="mt-1 font-display text-lg tabular-nums text-foreground">
              {patchVersion ?? '—'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCcw className={cn('h-4 w-4', syncChampions.isPending && 'animate-spin')} />}
          onClick={handleSync}
          disabled={syncChampions.isPending}
        >
          {syncChampions.isPending ? 'Sync en cours…' : 'Sync Data Dragon'}
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          variant="search"
          placeholder="Rechercher un champion…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {championsQuery.isLoading ? (
        <div className="flex items-center gap-3 border border-hairline bg-surface px-4 py-6 text-sm text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : champions.length === 0 ? (
        <div className="border border-hairline bg-surface px-4 py-10 text-center text-sm text-foreground-dim">
          <p>Aucun champion en base.</p>
          <p className="mt-2 label-mono text-foreground-muted">
            Lance une première synchronisation Data Dragon avec le bouton ci-dessus.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {filtered.map((champion) => {
            const roles = champion.roles as PlayerRole[];
            const disabled = !champion.enabled;
            const isUpdating =
              updateChampion.isPending && updateChampion.variables?.id === champion.id;

            return (
              <li
                key={champion.id}
                className={cn(
                  'flex flex-col gap-4 py-4 md:flex-row md:items-center md:gap-6',
                  disabled && 'opacity-50',
                )}
              >
                <div className="flex min-w-0 items-center gap-4 md:w-[280px]">
                  <span className="placeholder-diag h-12 w-12 shrink-0 overflow-hidden border border-hairline">
                    <img
                      src={champion.squareUrl}
                      alt={champion.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{champion.name}</p>
                    <p className="truncate label-mono text-foreground-muted">{champion.title}</p>
                  </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {PLAYER_ROLES.map((role) => {
                    const active = roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(champion.id, role, roles)}
                        disabled={isUpdating}
                        className={cn(
                          'border px-3 py-1.5 label-mono transition-colors disabled:cursor-not-allowed',
                          active
                            ? 'border-accent bg-accent/15 text-foreground'
                            : 'border-hairline text-foreground-muted hover:border-accent/40 hover:text-foreground',
                        )}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 md:ml-auto">
                  <input
                    type="checkbox"
                    checked={champion.enabled}
                    disabled={isUpdating}
                    onChange={(event) => toggleEnabled(champion.id, event.target.checked)}
                    className="h-4 w-4 border-hairline bg-surface text-accent"
                  />
                  <span className="label-mono">Actif</span>
                </label>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="py-8 text-center label-mono text-foreground-muted">
              Aucun champion ne correspond à « {search} ».
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
