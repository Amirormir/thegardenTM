'use client';

import type { DraftSide, DraftState, LockedAction } from '@nexus/draft-engine';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { cn } from '@/lib/utils/cn';

interface TeamLite {
  name: string;
  shortCode: string | null;
  logoUrl?: string | null;
}

interface DraftTeamPanelProps {
  side: DraftSide;
  team: TeamLite;
  state: DraftState;
  align?: 'left' | 'right';
}

function actionsFor(state: DraftState, side: DraftSide, type: LockedAction['type']) {
  return state.actions.filter((a) => a.side === side && a.type === type);
}

export function DraftTeamPanel({ side, team, state, align = 'left' }: DraftTeamPanelProps) {
  const picks = actionsFor(state, side, 'PICK');
  const bans = actionsFor(state, side, 'BAN');
  const accentVar = side === 'BLUE' ? 'var(--accent)' : 'var(--loss)';
  const label = side === 'BLUE' ? 'Blue side' : 'Red side';

  return (
    <section
      className={cn(
        'flex flex-1 flex-col gap-6 border border-hairline bg-surface px-6 py-6',
        align === 'right' && 'items-end text-right',
      )}
    >
      <header
        className={cn(
          'flex w-full items-center gap-3',
          align === 'right' && 'flex-row-reverse text-right',
        )}
      >
        <TeamAvatar
          name={team.name}
          shortCode={team.shortCode ?? team.name.slice(0, 3)}
          logoUrl={team.logoUrl ?? null}
          size="lg"
        />
        <div className={align === 'right' ? 'text-right' : 'text-left'}>
          <p className="label-mono" style={{ color: accentVar }}>
            {label}
          </p>
          <p className="font-display text-2xl text-foreground">{team.name}</p>
        </div>
      </header>

      <div className="flex w-full flex-col gap-3">
        <p className="label-mono text-foreground-muted">Picks</p>
        <ul className={cn('grid grid-cols-5 gap-2', align === 'right' && 'direction-rtl')}>
          {Array.from({ length: 5 }).map((_, i) => {
            const action = picks[i];
            return <Slot key={`pick-${i}`} action={action} kind="PICK" accent={accentVar} />;
          })}
        </ul>
      </div>

      <div className="flex w-full flex-col gap-3">
        <p className="label-mono text-foreground-muted">Bans</p>
        <ul className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const action = bans[i];
            return <Slot key={`ban-${i}`} action={action} kind="BAN" accent={accentVar} />;
          })}
        </ul>
      </div>
    </section>
  );
}

function Slot({
  action,
  kind,
  accent,
}: {
  action: LockedAction | undefined;
  kind: 'PICK' | 'BAN';
  accent: string;
}) {
  if (!action) {
    return (
      <li
        className={cn(
          'flex aspect-square items-center justify-center border border-dashed border-hairline bg-bg',
          kind === 'BAN' && 'opacity-60',
        )}
      />
    );
  }

  if (!action.championId) {
    return (
      <li
        className="flex aspect-square items-center justify-center border bg-bg label-mono text-foreground-muted"
        style={{ borderColor: accent }}
        title={action.wasAutoPicked ? 'Auto (timeout)' : 'Aucun'}
      >
        —
      </li>
    );
  }

  return (
    <li
      className={cn(
        'relative flex aspect-square items-center justify-center overflow-hidden border bg-bg',
        kind === 'BAN' && 'grayscale',
      )}
      style={{ borderColor: accent }}
      title={action.championId}
    >
      <ChampionIcon championId={action.championId} size="lg" className="h-full w-full rounded-none" />
      {kind === 'BAN' ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--loss)]">
          Ban
        </span>
      ) : null}
      {action.wasAutoPicked ? (
        <span className="absolute right-0.5 top-0.5 rounded-sm bg-black/60 px-1 text-[8px] font-mono uppercase tracking-wider text-foreground-dim">
          AUTO
        </span>
      ) : null}
    </li>
  );
}
