'use client';

import { useState } from 'react';
import { getChampionIconUrl } from '@/lib/utils/ddragon';
import { cn } from '@/lib/utils/cn';

interface ChampionIconProps {
  championId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5 text-[0.55rem]',
  md: 'h-7 w-7 text-[0.65rem]',
  lg: 'h-9 w-9 text-xs',
} as const;

function championHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function championInitials(id: string) {
  if (!id) return '??';
  const cleaned = id.replace(/[^a-zA-Z]/g, '');
  if (cleaned.length === 0) return '??';
  const upperRuns = cleaned.match(/[A-Z][a-z]*/g);
  if (upperRuns && upperRuns.length >= 2) {
    return (upperRuns[0]![0]! + upperRuns[1]![0]!).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function ChampionIcon({ championId, size = 'md', className }: ChampionIconProps) {
  const [errored, setErrored] = useState(false);
  const hue = championHue(championId);
  const initials = championInitials(championId);
  const url = getChampionIconUrl(championId);

  const baseClasses = cn(
    'inline-flex items-center justify-center overflow-hidden rounded-sm font-mono font-semibold uppercase tracking-[0.04em] leading-none',
    SIZE_CLASSES[size],
    className,
  );

  if (errored || !championId) {
    return (
      <span
        className={baseClasses}
        style={{
          background: `oklch(0.34 0.06 ${hue})`,
          color: `oklch(0.93 0.04 ${hue})`,
        }}
        aria-label={championId}
        title={championId}
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={baseClasses} aria-label={championId} title={championId}>
      <img
        src={url}
        alt={championId}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
