'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/trpc/react';

export interface TeamDraftPreferencesPanelProps {
  teamId: string;
  seasons: { id: string; name: string; year: number; isCurrent: boolean }[];
  defaultSeasonId: string | null;
}

const MAX_ROWS_PER_BLOCK = 8;

interface PreferenceRow {
  championId: string;
  count: number;
  share: number;
}

interface BlockProps {
  title: string;
  helper: string;
  rows: PreferenceRow[];
}

function PreferenceBlock({ title, helper, rows }: BlockProps) {
  return (
    <div className="flex flex-col gap-4 border border-hairline p-6">
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        <p className="text-xs text-foreground-muted">{helper}</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground-dim">Aucun champion enregistré.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.slice(0, MAX_ROWS_PER_BLOCK).map((row) => (
            <li
              key={row.championId}
              className="grid grid-cols-[auto_minmax(0,1fr)_3rem_3.5rem] items-center gap-3 border-t border-hairline py-2.5 first:border-t-0"
            >
              <ChampionIcon championId={row.championId} size="sm" />
              <Link
                href={`/league/stats/champions/${row.championId}`}
                className="truncate font-display text-foreground transition-colors hover:text-accent"
              >
                {row.championId}
              </Link>
              <span className="tabular-nums text-right">{row.count}</span>
              <span className="label-mono tabular-nums text-right text-foreground-dim">
                {(row.share * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, blockIdx) => (
          <div key={blockIdx} className="flex flex-col gap-4 border border-hairline p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            <ul className="flex flex-col gap-3 pt-2">
              {Array.from({ length: 5 }).map((__, rowIdx) => (
                <li
                  key={rowIdx}
                  className="grid grid-cols-[auto_minmax(0,1fr)_3rem_3.5rem] items-center gap-3"
                >
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-10" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamDraftPreferencesPanel({
  teamId,
  seasons,
  defaultSeasonId,
}: TeamDraftPreferencesPanelProps) {
  const [seasonId, setSeasonId] = useState<string>(defaultSeasonId ?? '');
  const enabled = seasonId !== '';

  const query = api.stats.getTeamDraftPreferences.useQuery(
    enabled ? { seasonId, teamId } : { seasonId: '', teamId },
    { enabled },
  );

  const data = query.data;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex flex-col gap-2">
          <p className="breadcrumb-mono">§ Préférences de draft</p>
          <h2 className="display-md text-foreground">Picks & bans</h2>
        </div>
        <div className="flex flex-col gap-2">
          <p className="label-mono">§ Saison</p>
          <Select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="min-w-[220px]"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isCurrent ? ' · en cours' : ''}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {!enabled ? (
        <p className="text-sm text-foreground-dim">
          Sélectionnez une saison pour afficher les préférences.
        </p>
      ) : query.isLoading ? (
        <PreferencesSkeleton />
      ) : data ? (
        <>
          <p className="label-mono">
            § {data.draftCount} draft{data.draftCount > 1 ? 's' : ''} joué
            {data.draftCount > 1 ? 's' : ''} cette saison
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <PreferenceBlock
              title="Picks par cette équipe"
              helper="Champions choisis le plus souvent par l'équipe."
              rows={data.picksFor}
            />
            <PreferenceBlock
              title="Bans par cette équipe"
              helper="Champions interdits le plus souvent par l'équipe."
              rows={data.bansFor}
            />
            <PreferenceBlock
              title="Picks contre cette équipe"
              helper="Champions joués face à cette équipe."
              rows={data.picksAgainst}
            />
            <PreferenceBlock
              title="Bans contre cette équipe"
              helper="Champions que l'adversaire refuse de laisser passer."
              rows={data.bansAgainst}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
