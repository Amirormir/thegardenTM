'use client';

import { useEffect, useState } from 'react';
import {
  DRAFT_SEQUENCE,
  type ChampionStats,
  type DraftSide,
  type DraftState,
  type LockedAction,
} from '@nexus/draft-engine';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { getChampionSplashUrl } from '@/lib/utils/ddragon';
import { cn } from '@/lib/utils/cn';

type PlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

const POSITIONAL_ORDER: readonly PlayerRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const ROLE_LABEL: Record<PlayerRole, string> = {
  TOP: 'Top',
  JUNGLE: 'Jng',
  MID: 'Mid',
  ADC: 'Adc',
  SUPPORT: 'Sup',
};

export interface TeamRosterPlayer {
  id: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  teamRole: PlayerRole | null;
}

export interface SlotStripTeam {
  id: string;
  name: string;
  shortCode: string | null;
  logoUrl?: string | null;
  players?: TeamRosterPlayer[];
}

interface DraftSidePanelProps {
  state: DraftState;
  team: SlotStripTeam;
  side: DraftSide;
  /** Most recently locked action — drives the splash reveal animation. */
  lastAction: LockedAction | null;
  /** Stats for the most recently picked champion, used in the reveal overlay. */
  lastChampionStats: ChampionStats | null;
  /**
   * Champion currently being hovered/selected by the captain on this side, before confirmation.
   * Renders a "pending" ghost on the next empty pick or ban slot.
   */
  tentativeChampionId: string | null;
  animationsEnabled?: boolean;
}

function actionsFor(state: DraftState, side: DraftSide, type: 'PICK' | 'BAN'): LockedAction[] {
  return state.actions.filter((a) => a.side === side && a.type === type);
}

function playerForSlot(
  players: readonly TeamRosterPlayer[] | undefined,
  role: PlayerRole,
): TeamRosterPlayer | null {
  if (!players || players.length === 0) return null;
  return players.find((p) => (p.teamRole ?? p.role) === role) ?? null;
}

export function DraftSidePanel({
  state,
  team,
  side,
  lastAction,
  lastChampionStats,
  tentativeChampionId,
  animationsEnabled = true,
}: DraftSidePanelProps) {
  const accent = side === 'BLUE' ? 'var(--accent)' : 'var(--loss)';
  const sideLabel = side === 'BLUE' ? 'Blue' : 'Red';
  const align: 'left' | 'right' = side === 'BLUE' ? 'left' : 'right';
  const picks = actionsFor(state, side, 'PICK');
  const bans = actionsFor(state, side, 'BAN');

  // Determine which slot (PICK or BAN) is currently active so we can ghost a tentative champion there.
  const stepDef = DRAFT_SEQUENCE[state.currentStep - 1];
  const isCurrentSide = stepDef?.side === side;
  const nextPickIndex = isCurrentSide && stepDef?.type === 'PICK' ? picks.length : -1;
  const nextBanIndex = isCurrentSide && stepDef?.type === 'BAN' ? bans.length : -1;

  return (
    <section className="flex w-full flex-col gap-3 border border-hairline bg-surface px-3 py-3">
      <header
        className={cn(
          'flex min-w-0 items-center gap-3 border-b border-hairline pb-3',
          align === 'right' && 'flex-row-reverse text-right',
        )}
      >
        <TeamAvatar
          name={team.name}
          shortCode={team.shortCode ?? team.name.slice(0, 3)}
          logoUrl={team.logoUrl ?? null}
          size="md"
        />
        <div className="min-w-0">
          <p className="label-mono" style={{ color: accent }}>
            {sideLabel}
          </p>
          <p className="truncate font-display text-base text-foreground">{team.name}</p>
        </div>
      </header>

      <div className={cn('flex items-center gap-2', align === 'right' && 'flex-row-reverse')}>
        <span className="label-mono text-[10px]" style={{ color: accent }}>
          Bans
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      <ul className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <BanSlot
            key={`ban-${i}`}
            action={bans[i]}
            accent={accent}
            tentativeChampionId={i === nextBanIndex ? tentativeChampionId : null}
          />
        ))}
      </ul>

      <div className={cn('mt-1 flex items-center gap-2', align === 'right' && 'flex-row-reverse')}>
        <span className="label-mono text-[10px]" style={{ color: accent }}>
          Picks
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {POSITIONAL_ORDER.map((role, i) => {
          const action = picks[i];
          const player = playerForSlot(team.players, role);
          const isLast =
            !!action &&
            !!action.championId &&
            lastAction?.championId === action.championId &&
            lastAction.side === side &&
            lastAction.step === action.step;
          const tentative = i === nextPickIndex ? tentativeChampionId : null;
          return (
            <PickSlot
              key={role}
              role={role}
              accent={accent}
              align={align}
              action={action}
              player={player}
              isLast={isLast}
              championStats={isLast ? lastChampionStats : null}
              animationsEnabled={animationsEnabled}
              tentativeChampionId={tentative}
            />
          );
        })}
      </ul>
    </section>
  );
}

function BanSlot({
  action,
  accent,
  tentativeChampionId,
}: {
  action: LockedAction | undefined;
  accent: string;
  tentativeChampionId: string | null;
}) {
  if (!action || !action.championId) {
    if (tentativeChampionId) {
      return (
        <li
          className="relative aspect-square overflow-hidden border border-dashed bg-bg/60 animate-[pulseBorder_1500ms_ease-in-out_infinite]"
          style={{ borderColor: accent }}
          title={`Sélection en cours : ${tentativeChampionId}`}
          aria-label="ban en cours de sélection"
        >
          <ChampionIcon
            championId={tentativeChampionId}
            size="lg"
            className="h-full w-full rounded-none opacity-70"
          />
          <span className="pointer-events-none absolute inset-0 bg-black/40" />
        </li>
      );
    }
    return (
      <li
        className="aspect-square border border-dashed border-hairline bg-bg/60 opacity-60"
        aria-label="ban vide"
      />
    );
  }
  return (
    <li
      className="relative aspect-square overflow-hidden border bg-bg grayscale"
      style={{ borderColor: accent }}
      title={action.championId}
    >
      <ChampionIcon
        championId={action.championId}
        size="lg"
        className="h-full w-full rounded-none"
      />
      <span className="pointer-events-none absolute inset-0 bg-black/50" />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: accent }}
      >
        Ban
      </span>
    </li>
  );
}

function PickSlot({
  role,
  accent,
  align,
  action,
  player,
  isLast,
  championStats,
  animationsEnabled,
  tentativeChampionId,
}: {
  role: PlayerRole;
  accent: string;
  align: 'left' | 'right';
  action: LockedAction | undefined;
  player: TeamRosterPlayer | null;
  isLast: boolean;
  championStats: ChampionStats | null;
  animationsEnabled: boolean;
  tentativeChampionId: string | null;
}) {
  const championId = action?.championId ?? null;
  const playerLabel = player ? `${player.firstName} ${player.lastName}`.trim() : ROLE_LABEL[role];
  const showOverlay = useStatsRevealVisible(isLast, animationsEnabled);

  if (!championId) {
    if (tentativeChampionId) {
      return (
        <li
          className="relative flex h-16 flex-col overflow-hidden border border-dashed bg-bg/60 animate-[pulseBorder_1500ms_ease-in-out_infinite]"
          style={{ borderColor: accent }}
          title={`Sélection en cours : ${tentativeChampionId}`}
        >
          <img
            src={getChampionSplashUrl(tentativeChampionId)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_22%] opacity-40"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 100%)',
            }}
          />
          <div
            className={cn(
              'relative z-10 flex h-full items-center gap-2 px-2',
              align === 'right' && 'flex-row-reverse text-right',
            )}
          >
            <ChampionIcon
              championId={tentativeChampionId}
              size="lg"
              className="h-12 w-12 rounded-none border opacity-90"
            />
            <div className={cn('flex min-w-0 flex-col', align === 'right' && 'items-end')}>
              <p className="label-mono text-[9px]" style={{ color: accent }}>
                {ROLE_LABEL[role]} · En réflexion
              </p>
              <p className="max-w-full truncate text-[11px] font-semibold text-foreground" title={playerLabel}>
                {playerLabel}
              </p>
            </div>
          </div>
        </li>
      );
    }
    return (
      <li
        className={cn(
          'flex h-16 items-center gap-2 border border-dashed border-hairline bg-bg/60 px-2',
          align === 'right' && 'flex-row-reverse text-right',
        )}
      >
        <div className="h-12 w-12 shrink-0 border border-hairline/50 bg-black/30" aria-hidden="true" />
        <div className={cn('flex min-w-0 flex-col', align === 'right' && 'items-end')}>
          <p className="label-mono text-[9px] text-foreground-muted">{ROLE_LABEL[role]}</p>
          <p
            className="max-w-full truncate text-[11px] uppercase tracking-wider text-foreground-muted/70"
            title={playerLabel}
          >
            {playerLabel}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        'relative flex h-16 overflow-hidden border bg-bg',
        animationsEnabled && isLast && 'animate-[slotFlash_600ms_ease-out]',
      )}
      style={{ borderColor: accent }}
      title={championId}
    >
      {/* Splash background — decorative; falls back transparently if it fails to load */}
      <img
        src={getChampionSplashUrl(championId)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_22%] opacity-60',
          animationsEnabled && isLast && 'animate-[fadeIn_400ms_ease-out]',
        )}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <div
        className={cn(
          'relative z-10 flex h-full w-full items-center gap-2 px-2',
          align === 'right' && 'flex-row-reverse text-right',
        )}
      >
        <ChampionIcon
          championId={championId}
          size="lg"
          className="h-12 w-12 shrink-0 rounded-none border"
        />
        <div className={cn('flex min-w-0 flex-col', align === 'right' && 'items-end')}>
          <p className="label-mono text-[9px]" style={{ color: accent }}>
            {ROLE_LABEL[role]}
          </p>
          <p
            className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wider text-foreground"
            title={playerLabel}
          >
            {playerLabel}
          </p>
        </div>
      </div>

      {action?.wasAutoPicked ? (
        <span className="absolute right-1 top-1 z-10 rounded-sm bg-black/70 px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider text-foreground-dim">
          Auto
        </span>
      ) : null}
      {showOverlay && championStats ? (
        <StatsRevealOverlay stats={championStats} animationsEnabled={animationsEnabled} />
      ) : null}
    </li>
  );
}

const OVERLAY_DURATION_MS = 2500;

function useStatsRevealVisible(isLast: boolean, animationsEnabled: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!isLast || !animationsEnabled) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), OVERLAY_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [isLast, animationsEnabled]);
  return visible;
}

function StatsRevealOverlay({
  stats,
  animationsEnabled,
}: {
  stats: ChampionStats;
  animationsEnabled: boolean;
}) {
  const presence =
    stats.presenceRate === null ? '—' : `${Math.round(stats.presenceRate * 100)}%`;
  const winrate =
    stats.winRate === null ? '—' : `${Math.round(stats.winRate * 100)}%`;
  const winrateColor =
    stats.winRate === null
      ? 'text-foreground'
      : stats.winRate >= 0.55
        ? 'text-[color:var(--win)]'
        : stats.winRate <= 0.45
          ? 'text-[color:var(--loss)]'
          : 'text-foreground';
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-[2px]',
        animationsEnabled && 'animate-[overlayFade_2500ms_ease-out_forwards]',
      )}
    >
      <div className="flex items-center gap-3 px-2 text-center">
        <div className="flex flex-col">
          <p className="label-mono text-[8px] text-foreground-muted">Pick</p>
          <p className="font-display text-base tabular-nums text-foreground">{stats.pickCount}</p>
        </div>
        <div className="flex flex-col">
          <p className="label-mono text-[8px] text-foreground-muted">Presence</p>
          <p className="font-display text-base tabular-nums text-foreground">{presence}</p>
        </div>
        <div className="flex flex-col">
          <p className="label-mono text-[8px] text-foreground-muted">Winrate</p>
          <p className={cn('font-display text-base tabular-nums', winrateColor)}>{winrate}</p>
        </div>
      </div>
    </div>
  );
}
