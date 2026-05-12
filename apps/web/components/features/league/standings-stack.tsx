'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import type { TeamStanding } from '@nexus/types';
import { useTeamTint } from '@/components/ui/team-tint';
import { cn } from '@/lib/utils/cn';

/* ── Noise layer (references shared SVG filter) ── */

function NoiseLayer({ filterId }: { filterId: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03] mix-blend-soft-light"
      aria-hidden="true"
    >
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

/* ── Count-up animation hook ── */

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active, prefersReduced]);

  return value;
}

/* ── Form dots sparkline ── */

function FormDots({ form }: { form: ('W' | 'L')[] }) {
  if (form.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {form.map((r, i) => (
        <div
          key={i}
          className={cn(
            'h-2 w-2 rounded-full',
            r === 'W'
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
              : 'bg-rose-400/60',
          )}
        />
      ))}
    </div>
  );
}

/* ── Single standing card ── */

interface StandingCardProps {
  team: TeamStanding;
  rank: number;
  isLeader: boolean;
  form: ('W' | 'L')[];
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  index: number;
  inView: boolean;
  noiseFilterId: string;
}

function StandingCard({
  team,
  rank,
  isLeader,
  form,
  isHovered,
  isAnyHovered,
  onHover,
  onLeave,
  index,
  inView,
  noiseFilterId,
}: StandingCardProps) {
  const { dominantColor } = useTeamTint(team.logoUrl);
  const prefersReduced = useReducedMotion();

  const pts = useCountUp(team.points, 900 + index * 80, inView);
  const wins = useCountUp(team.wins, 700 + index * 60, inView);
  const losses = useCountUp(team.losses, 700 + index * 60, inView);

  const rgba = (a: number) =>
    `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, ${a})`;

  const cardStyle: CSSProperties = {
    background: `linear-gradient(105deg, ${rgba(0.08)} 0%, ${rgba(0.025)} 38%, rgba(18,18,26,0.94) 72%)`,
    borderColor: isHovered ? rgba(0.2) : 'rgba(255,255,255,0.04)',
    boxShadow: isHovered
      ? `0 20px 50px rgba(0,0,0,0.4), 0 0 36px ${rgba(0.08)}`
      : '0 4px 20px rgba(0,0,0,0.15)',
  };

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <Link href={`/league/teams/${team.slug}`} className="block">
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300',
            isLeader ? 'px-6 py-7 md:px-8 md:py-9' : 'px-5 py-5 md:px-7 md:py-6',
            isAnyHovered && !isHovered && 'scale-[0.995] opacity-50',
            isHovered && 'scale-[1.008]',
          )}
          style={cardStyle}
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
        >
          <NoiseLayer filterId={noiseFilterId} />

          {/* Team color ambient glow */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-2/5"
            style={{
              background: `radial-gradient(ellipse at 8% 50%, ${rgba(0.1)} 0%, transparent 65%)`,
            }}
          />

          {/* Gold accent line for leader */}
          {isLeader && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
          )}

          <div className="relative flex items-center gap-4 md:gap-7">
            {/* Rank */}
            <div
              className={cn(
                'shrink-0 select-none font-display font-black tabular-nums leading-none',
                isLeader ? 'text-5xl md:text-7xl' : 'text-4xl md:text-[3.5rem]',
                rank <= 3 ? 'text-amber-400/30' : 'text-white/[0.06]',
              )}
            >
              {rank}
            </div>

            {/* Logo */}
            <div className="relative shrink-0">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className={cn(
                    'rounded-xl object-cover',
                    isLeader
                      ? 'h-20 w-20 md:h-[140px] md:w-[140px]'
                      : 'h-16 w-16 md:h-[120px] md:w-[120px]',
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 font-display font-bold text-white/50',
                    isLeader
                      ? 'h-20 w-20 text-xl md:h-[140px] md:w-[140px] md:text-3xl'
                      : 'h-16 w-16 text-lg md:h-[120px] md:w-[120px] md:text-2xl',
                  )}
                >
                  {team.shortCode.slice(0, 3)}
                </div>
              )}
              <div
                className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: `0 0 24px ${rgba(0.2)}` }}
              />
            </div>

            {/* Name + form */}
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  'truncate font-display font-bold tracking-tight text-white',
                  isLeader
                    ? 'text-[1.75rem] md:text-[2.75rem] md:leading-[1.1]'
                    : 'text-xl md:text-[2.25rem] md:leading-[1.1]',
                )}
              >
                {team.name}
              </h3>
              <div className="mt-1.5 flex items-center gap-3 md:mt-2">
                <span className="text-[0.62rem] uppercase tracking-[0.1em] text-text-secondary">
                  {team.shortCode}
                </span>
                {form.length > 0 && (
                  <>
                    <span className="h-3 w-px bg-white/[0.06]" />
                    <FormDots form={form} />
                  </>
                )}
              </div>
            </div>

            {/* Stats constellation — desktop */}
            <div className="hidden shrink-0 items-end gap-6 md:flex lg:gap-9">
              <div className="text-center">
                <p className="font-display text-xl font-bold tabular-nums text-white lg:text-2xl">
                  {wins}
                </p>
                <p className="mt-1 text-[0.58rem] uppercase tracking-[0.12em] text-emerald-400/70">
                  W
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-bold tabular-nums text-white/50 lg:text-2xl">
                  {losses}
                </p>
                <p className="mt-1 text-[0.58rem] uppercase tracking-[0.12em] text-rose-400/50">
                  L
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm tabular-nums text-text-secondary">
                  {team.mapWins}–{team.mapLosses}
                </p>
                <p className="mt-1 text-[0.58rem] uppercase tracking-[0.12em] text-text-muted">
                  Maps
                </p>
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'font-display font-black tabular-nums leading-none',
                    isLeader ? 'text-4xl lg:text-[3.5rem]' : 'text-3xl lg:text-5xl',
                  )}
                  style={{ color: rgba(0.9) }}
                >
                  {pts}
                </p>
                <p className="mt-1.5 text-[0.58rem] uppercase tracking-[0.12em] text-text-secondary">
                  Pts
                </p>
              </div>
            </div>

            {/* Stats — mobile */}
            <div className="flex shrink-0 flex-col items-end md:hidden">
              <p
                className="font-display text-2xl font-black tabular-nums leading-none"
                style={{ color: rgba(0.9) }}
              >
                {pts}
              </p>
              <p className="mt-1 text-[0.58rem] tabular-nums uppercase tracking-[0.1em] text-text-secondary">
                {team.wins}W {team.losses}L
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Stack container ── */

export interface StandingsStackProps {
  standings: TeamStanding[];
  recentForm?: Record<string, ('W' | 'L')[]>;
}

export function StandingsStack({
  standings,
  recentForm = {},
}: StandingsStackProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-60px' });
  const noiseId = useId();

  return (
    <div ref={containerRef} className="relative space-y-3">
      {/* Shared SVG noise filter */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={noiseId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
        </defs>
      </svg>

      {standings.map((team, index) => (
        <StandingCard
          key={team.id}
          team={team}
          rank={index + 1}
          isLeader={index === 0}
          form={recentForm[team.id] ?? []}
          isHovered={hoveredId === team.id}
          isAnyHovered={hoveredId !== null}
          onHover={() => setHoveredId(team.id)}
          onLeave={() => setHoveredId(null)}
          index={index}
          inView={inView}
          noiseFilterId={noiseId}
        />
      ))}
    </div>
  );
}
