'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate } from '@/lib/utils/format';

type DraftStatusFilter = 'ALL' | 'LIVE' | 'LOBBY' | 'COMPLETED';

const STATUS_FILTERS: { value: DraftStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'LIVE', label: 'En cours' },
  { value: 'LOBBY', label: 'Lobby' },
  { value: 'COMPLETED', label: 'Archives' },
];

const STATUS_PILL: Record<string, string> = {
  IN_PROGRESS: 'border-accent text-accent',
  COINFLIP: 'border-sky-400/40 text-sky-300',
  PAUSED: 'border-amber-400/40 text-amber-300',
  LOBBY: 'border-hairline text-foreground-dim',
  COMPLETED: 'border-emerald-500/40 text-[color:var(--win)]',
  CANCELLED: 'border-rose-500/40 text-[color:var(--loss)]',
};

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: 'En cours',
  COINFLIP: 'Coin flip',
  PAUSED: 'En pause',
  LOBBY: 'Lobby',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export function DraftList() {
  const [filter, setFilter] = useState<DraftStatusFilter>('ALL');

  const statusInput = useMemo<('IN_PROGRESS' | 'COINFLIP' | 'PAUSED' | 'LOBBY' | 'COMPLETED')[] | undefined>(() => {
    if (filter === 'LIVE') return ['IN_PROGRESS', 'COINFLIP', 'PAUSED'];
    if (filter === 'LOBBY') return ['LOBBY'];
    if (filter === 'COMPLETED') return ['COMPLETED'];
    return undefined;
  }, [filter]);

  // Only show Game 1 — it acts as the series hub. G2+ are reachable from the in-room tabs.
  const draftsQuery = api.draft.list.useQuery(
    statusInput ? { status: statusInput, gameNumber: 1 } : { gameNumber: 1 },
  );

  const drafts = draftsQuery.data ?? [];

  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              'border px-3 py-1.5 text-sm transition-colors duration-150',
              filter === option.value
                ? 'border-accent bg-accent/10 text-foreground'
                : 'border-hairline bg-surface text-foreground-dim hover:bg-surface-hover hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {draftsQuery.isLoading ? (
        <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-6 text-sm text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="border border-hairline bg-surface px-5 py-6">
          <p className="text-sm text-foreground-dim">Aucun draft à afficher pour ce filtre.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/draft/${draft.id}`}
                className="group flex flex-col gap-4 border border-hairline bg-surface px-5 py-5 transition-colors duration-150 hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 border px-2 py-0.5 label-mono',
                      STATUS_PILL[draft.status] ?? 'border-hairline text-foreground-dim',
                    )}
                  >
                    {draft.status === 'IN_PROGRESS' ? (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    ) : null}
                    {STATUS_LABEL[draft.status] ?? draft.status}
                  </span>
                  <span className="label-mono text-foreground-muted">
                    {draft.format === 'BO1' ? 'BO1' : `${draft.format} · Série`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TeamAvatar
                      name={draft.blueTeam.name}
                      shortCode={draft.blueTeam.shortCode}
                      logoUrl={draft.blueTeam.logoUrl}
                      size="md"
                    />
                    <div>
                      <p className="text-sm text-foreground">{draft.blueTeam.name}</p>
                      <p className="label-mono text-[color:var(--accent)]">Blue</p>
                    </div>
                  </div>
                  <span className="font-display text-xl text-foreground-muted">vs</span>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-foreground">{draft.redTeam.name}</p>
                      <p className="label-mono text-[color:var(--loss)]">Red</p>
                    </div>
                    <TeamAvatar
                      name={draft.redTeam.name}
                      shortCode={draft.redTeam.shortCode}
                      logoUrl={draft.redTeam.logoUrl}
                      size="md"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3 label-mono text-foreground-muted">
                  <span>{draft.season.name}</span>
                  <span className="tabular-nums">
                    {draft.fearless ? 'Fearless · ' : ''}
                    Patch {draft.patchVersion}
                  </span>
                  <span className="tabular-nums">{formatCompactDate(draft.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
