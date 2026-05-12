'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useId, useState } from 'react';
import { useTeamTint } from '@/components/ui/team-tint';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate } from '@/lib/utils/format';

/* ── Noise overlay (self-contained per card) ── */

function NoiseOverlay() {
  const id = useId();
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-[0.03] mix-blend-soft-light"
      aria-hidden="true"
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/* ── Fight match card ── */

export interface FightMatchCardProps {
  match: {
    id: string;
    format: string;
    scheduledAt: string | Date;
    playedAt?: string | Date | null;
    homeScore: number;
    awayScore: number;
    isCompleted: boolean;
    homeTeam: { name: string; shortCode: string; logoUrl?: string | null };
    awayTeam: { name: string; shortCode: string; logoUrl?: string | null };
  };
  index?: number;
}

export function FightMatchCard({ match, index = 0 }: FightMatchCardProps) {
  const prefersReduced = useReducedMotion();
  const { dominantColor: homeColor } = useTeamTint(match.homeTeam.logoUrl);
  const { dominantColor: awayColor } = useTeamTint(match.awayTeam.logoUrl);

  // Avoid SSR/client hydration mismatch for Date.now()
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    if (!match.isCompleted) {
      setIsLive(new Date(match.scheduledAt).getTime() <= Date.now());
    }
  }, [match.isCompleted, match.scheduledAt]);

  const homeWins = match.isCompleted && match.homeScore > match.awayScore;
  const awayWins = match.isCompleted && match.awayScore > match.homeScore;
  const displayDate = match.playedAt ?? match.scheduledAt;

  const homeRgba = (a: number) =>
    `rgba(${homeColor.r}, ${homeColor.g}, ${homeColor.b}, ${a})`;
  const awayRgba = (a: number) =>
    `rgba(${awayColor.r}, ${awayColor.g}, ${awayColor.b}, ${a})`;

  const homeGradient: CSSProperties = {
    background: `linear-gradient(115deg, ${homeRgba(0.1)} 0%, transparent 65%)`,
    ...(match.isCompleted && !homeWins
      ? { filter: 'brightness(0.6) saturate(0.5)' }
      : {}),
  };

  const awayGradient: CSSProperties = {
    background: `linear-gradient(245deg, ${awayRgba(0.1)} 0%, transparent 65%)`,
    ...(match.isCompleted && !awayWins
      ? { filter: 'brightness(0.6) saturate(0.5)' }
      : {}),
  };

  const homeScoreStyle: CSSProperties = homeWins
    ? { textShadow: `0 0 40px ${homeRgba(0.3)}` }
    : {};
  const awayScoreStyle: CSSProperties = awayWins
    ? { textShadow: `0 0 40px ${awayRgba(0.3)}` }
    : {};

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.45,
        delay: index * 0.08,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <Link href={`/league/matches/${match.id}`} className="block">
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[rgba(14,14,20,0.95)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]',
            isLive && 'animate-[live-pulse_2s_ease-in-out_infinite]',
          )}
        >
          <NoiseOverlay />

          {/* Format badge — top left */}
          <div className="absolute left-4 top-4 z-20 rounded-full bg-white/[0.06] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.04em] text-white/60 backdrop-blur-sm">
            {match.format}
          </div>

          {/* Date postmark stamp — top right */}
          <div className="absolute right-4 top-4 z-20 -rotate-3 rounded border border-dashed border-white/[0.1] bg-black/20 px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.08em] text-text-secondary backdrop-blur-sm">
            {formatCompactDate(displayDate)}
          </div>

          {/* Two halves */}
          <div className="grid grid-cols-2">
            {/* Home half */}
            <div
              className="relative flex flex-col items-center px-4 pb-6 pt-14 transition-transform duration-300 group-hover:-translate-x-[2px] md:px-8 md:pb-8 md:pt-16"
              style={homeGradient}
            >
              {/* Logo watermark */}
              {match.homeTeam.logoUrl && (
                <img
                  src={match.homeTeam.logoUrl}
                  alt=""
                  className="pointer-events-none absolute inset-0 m-auto h-28 w-28 object-cover opacity-[0.04] md:h-40 md:w-40"
                  aria-hidden="true"
                />
              )}

              <div className="relative text-center">
                {match.homeTeam.logoUrl ? (
                  <img
                    src={match.homeTeam.logoUrl}
                    alt={match.homeTeam.name}
                    className="mx-auto h-12 w-12 rounded-lg object-cover ring-1 ring-white/[0.06] md:h-16 md:w-16"
                  />
                ) : (
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 font-display text-sm font-bold text-white/50 ring-1 ring-white/[0.06] md:h-16 md:w-16">
                    {match.homeTeam.shortCode.slice(0, 3)}
                  </div>
                )}

                <p
                  className={cn(
                    'mt-3 font-display font-black tabular-nums leading-none md:mt-5',
                    homeWins
                      ? 'text-[56px] text-white md:text-[80px] lg:text-[100px]'
                      : 'text-[56px] text-white/40 md:text-[80px] lg:text-[100px]',
                  )}
                  style={homeScoreStyle}
                >
                  {match.homeScore}
                </p>

                <p className="mt-2 font-display text-sm font-bold tracking-tight text-white md:mt-3 md:text-base">
                  {match.homeTeam.name}
                </p>
                <p className="mt-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-text-secondary">
                  {match.homeTeam.shortCode}
                </p>
              </div>
            </div>

            {/* Away half */}
            <div
              className="relative flex flex-col items-center px-4 pb-6 pt-14 transition-transform duration-300 group-hover:translate-x-[2px] md:px-8 md:pb-8 md:pt-16"
              style={awayGradient}
            >
              {match.awayTeam.logoUrl && (
                <img
                  src={match.awayTeam.logoUrl}
                  alt=""
                  className="pointer-events-none absolute inset-0 m-auto h-28 w-28 object-cover opacity-[0.04] md:h-40 md:w-40"
                  aria-hidden="true"
                />
              )}

              <div className="relative text-center">
                {match.awayTeam.logoUrl ? (
                  <img
                    src={match.awayTeam.logoUrl}
                    alt={match.awayTeam.name}
                    className="mx-auto h-12 w-12 rounded-lg object-cover ring-1 ring-white/[0.06] md:h-16 md:w-16"
                  />
                ) : (
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 font-display text-sm font-bold text-white/50 ring-1 ring-white/[0.06] md:h-16 md:w-16">
                    {match.awayTeam.shortCode.slice(0, 3)}
                  </div>
                )}

                <p
                  className={cn(
                    'mt-3 font-display font-black tabular-nums leading-none md:mt-5',
                    awayWins
                      ? 'text-[56px] text-white md:text-[80px] lg:text-[100px]'
                      : 'text-[56px] text-white/40 md:text-[80px] lg:text-[100px]',
                  )}
                  style={awayScoreStyle}
                >
                  {match.awayScore}
                </p>

                <p className="mt-2 font-display text-sm font-bold tracking-tight text-white md:mt-3 md:text-base">
                  {match.awayTeam.name}
                </p>
                <p className="mt-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-text-secondary">
                  {match.awayTeam.shortCode}
                </p>
              </div>
            </div>
          </div>

          {/* Center divider */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-[calc(100%-theme(spacing.10))] w-px -translate-x-1/2 bg-white/[0.04] transition-all duration-300 group-hover:bg-white/[0.08] group-hover:shadow-[0_0_12px_rgba(255,255,255,0.04)]" />

          {/* Status bar */}
          <div className="relative z-10 border-t border-white/[0.04] px-5 py-3 text-center">
            {isLive ? (
              <div className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-red-400">
                  En direct
                </span>
              </div>
            ) : match.isCompleted ? (
              <span className="text-[0.62rem] uppercase tracking-[0.12em] text-text-secondary">
                Final
              </span>
            ) : (
              <span className="text-[0.62rem] uppercase tracking-[0.12em] text-text-secondary">
                Programme
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
