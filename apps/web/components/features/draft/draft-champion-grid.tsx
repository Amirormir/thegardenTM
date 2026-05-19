'use client';

import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { PlayerRole } from '@nexus/db';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

interface DraftChampionGridProps {
  unavailableIds: Set<string>;
  /** True when the local user can select an action (their turn, no submit in flight). */
  canPick: boolean;
  /** Currently highlighted champion (pending confirmation). */
  selectedChampionId: string | null;
  /** Toggle a champion as the pending selection. Passing the already-selected id deselects. */
  onSelect: (championId: string) => void;
  /** Champion currently being submitted to the server (shows a spinner overlay). */
  pendingChampionId?: string | null;
}

const ROLE_FILTERS: { value: PlayerRole | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'TOP', label: 'Top' },
  { value: 'JUNGLE', label: 'Jng' },
  { value: 'MID', label: 'Mid' },
  { value: 'ADC', label: 'Adc' },
  { value: 'SUPPORT', label: 'Sup' },
];

export function DraftChampionGrid({
  unavailableIds,
  canPick,
  selectedChampionId,
  onSelect,
  pendingChampionId,
}: DraftChampionGridProps) {
  const championsQuery = api.champion.list.useQuery({ onlyEnabled: true });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<PlayerRole | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const list = championsQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((c) => {
      if (role !== 'ALL' && !c.roles.includes(role)) return false;
      if (term && !c.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [championsQuery.data, search, role]);

  if (championsQuery.isLoading) {
    return (
      <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-6 text-sm text-foreground-dim">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement du roster…
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 border border-hairline bg-surface px-5 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {ROLE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                'border px-2.5 py-1 label-mono transition-colors duration-150',
                role === option.value
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-hairline bg-bg text-foreground-dim hover:bg-surface-hover hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 border border-hairline bg-bg px-2 py-1 text-sm">
          <Search className="h-3.5 w-3.5 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un champion"
            className="w-56 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          />
        </label>
      </header>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {filtered.map((c) => {
            const unavailable = unavailableIds.has(c.id);
            const isSelected = selectedChampionId === c.id;
            const isSubmittingThis = pendingChampionId === c.id;
            const disabled = unavailable || (!canPick && !isSelected) || pendingChampionId !== null;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  disabled={disabled}
                  title={c.name}
                  className={cn(
                    'relative aspect-square w-full overflow-hidden border bg-bg transition-all duration-150',
                    unavailable
                      ? 'border-hairline opacity-30 grayscale'
                      : canPick
                        ? 'border-hairline hover:border-accent hover:scale-[1.04] hover:z-10'
                        : 'border-hairline opacity-70 cursor-not-allowed',
                    isSelected && 'border-accent ring-2 ring-accent scale-[1.04] z-10',
                  )}
                >
                  <ChampionIcon
                    championId={c.id}
                    size="lg"
                    className="h-full w-full rounded-none"
                  />
                  {isSubmittingThis ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {filtered.length === 0 ? (
        <p className="border-t border-hairline pt-3 text-sm text-foreground-dim">
          Aucun champion ne correspond à ces filtres.
        </p>
      ) : null}
    </section>
  );
}
