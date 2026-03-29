'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TeamTintColor {
  r: number;
  g: number;
  b: number;
}

const DEFAULT_TEAM_TINT: TeamTintColor = {
  r: 124,
  g: 58,
  b: 237,
};

function toRgba(color: TeamTintColor, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function normalizeColor(color: TeamTintColor) {
  const max = Math.max(color.r, color.g, color.b);

  if (max === 0) {
    return DEFAULT_TEAM_TINT;
  }

  const boost = max < 148 ? 148 / max : 1;

  return {
    r: Math.min(255, Math.round(color.r * boost)),
    g: Math.min(255, Math.round(color.g * boost)),
    b: Math.min(255, Math.round(color.b * boost)),
  };
}

function getPixelWeight(r: number, g: number, b: number, alpha: number) {
  if (alpha < 96) {
    return 0;
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (brightness < 20) {
    return 0;
  }

  if (brightness > 240 && saturation < 0.28) {
    return 0;
  }

  return 0.24 + saturation * 1.9 + (alpha / 255) * 0.5;
}

function buildProxiedLogoUrl(logoUrl: string | null | undefined) {
  if (!logoUrl) {
    return null;
  }

  return `/api/team-logo?url=${encodeURIComponent(logoUrl)}`;
}

async function extractDominantColor(imageUrl: string): Promise<TeamTintColor> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.decoding = 'async';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 28;
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(DEFAULT_TEAM_TINT);
          return;
        }

        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);

        let weightedRed = 0;
        let weightedGreen = 0;
        let weightedBlue = 0;
        let totalWeight = 0;
        let fallbackRed = 0;
        let fallbackGreen = 0;
        let fallbackBlue = 0;
        let fallbackCount = 0;

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index] ?? 0;
          const green = data[index + 1] ?? 0;
          const blue = data[index + 2] ?? 0;
          const alpha = data[index + 3] ?? 0;

          if (alpha < 96) {
            continue;
          }

          fallbackRed += red;
          fallbackGreen += green;
          fallbackBlue += blue;
          fallbackCount += 1;

          const weight = getPixelWeight(red, green, blue, alpha);
          if (weight === 0) {
            continue;
          }

          weightedRed += red * weight;
          weightedGreen += green * weight;
          weightedBlue += blue * weight;
          totalWeight += weight;
        }

        if (totalWeight > 0) {
          resolve(
            normalizeColor({
              r: Math.round(weightedRed / totalWeight),
              g: Math.round(weightedGreen / totalWeight),
              b: Math.round(weightedBlue / totalWeight),
            }),
          );
          return;
        }

        if (fallbackCount > 0) {
          resolve(
            normalizeColor({
              r: Math.round(fallbackRed / fallbackCount),
              g: Math.round(fallbackGreen / fallbackCount),
              b: Math.round(fallbackBlue / fallbackCount),
            }),
          );
          return;
        }

        resolve(DEFAULT_TEAM_TINT);
      } catch {
        resolve(DEFAULT_TEAM_TINT);
      }
    };

    image.onerror = () => resolve(DEFAULT_TEAM_TINT);
    image.src = imageUrl;
  });
}

export function useTeamTint(logoUrl: string | null | undefined) {
  const [dominantColor, setDominantColor] = useState<TeamTintColor>(DEFAULT_TEAM_TINT);
  const proxiedLogoUrl = buildProxiedLogoUrl(logoUrl);

  useEffect(() => {
    let cancelled = false;

    if (!proxiedLogoUrl) {
      setDominantColor(DEFAULT_TEAM_TINT);
      return () => {
        cancelled = true;
      };
    }

    extractDominantColor(proxiedLogoUrl).then((color) => {
      if (!cancelled) {
        setDominantColor(color);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [proxiedLogoUrl]);

  return {
    dominantColor,
    proxiedLogoUrl,
  };
}

interface TeamTintCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  contentClassName?: string;
  elevated?: boolean;
  logoUrl?: string | null | undefined;
}

export function TeamTintCard({
  children,
  className,
  contentClassName,
  elevated = false,
  logoUrl,
  style,
  ...props
}: TeamTintCardProps) {
  const { dominantColor } = useTeamTint(logoUrl);

  const cardStyle: CSSProperties = {
    background: elevated
      ? `linear-gradient(180deg, ${toRgba(dominantColor, 0.24)} 0%, transparent 52%), linear-gradient(145deg, ${toRgba(dominantColor, 0.16)} 0%, rgba(16, 15, 23, 0.88) 60%, rgba(255, 255, 255, 0.05) 100%)`
      : `linear-gradient(145deg, ${toRgba(dominantColor, 0.18)} 0%, rgba(18, 18, 26, 0.84) 62%, rgba(255, 255, 255, 0.05) 100%)`,
    borderColor: toRgba(dominantColor, elevated ? 0.26 : 0.18),
    boxShadow: elevated
      ? `0 30px 80px rgba(0, 0, 0, 0.45), 0 0 42px ${toRgba(dominantColor, 0.14)}`
      : `var(--glass-shadow), 0 0 32px ${toRgba(dominantColor, 0.12)}`,
    backdropFilter: `blur(${elevated ? 20 : 16}px) saturate(180%)`,
    ...style,
  };

  const glowStyle: CSSProperties = {
    background: `radial-gradient(circle at top right, ${toRgba(dominantColor, elevated ? 0.4 : 0.28)} 0%, transparent 42%)`,
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden border p-5 transition duration-300 hover:-translate-y-1',
        elevated ? 'rounded-[1.5rem]' : 'rounded-[1.25rem]',
        className,
      )}
      style={cardStyle}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" style={glowStyle} />
      <div className={cn('relative', contentClassName)}>{children}</div>
    </div>
  );
}

interface TeamTintMediaFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  logoUrl?: string | null | undefined;
}

export function TeamTintMediaFrame({
  children,
  className,
  logoUrl,
  style,
  ...props
}: TeamTintMediaFrameProps) {
  const { dominantColor } = useTeamTint(logoUrl);

  const mediaStyle: CSSProperties = {
    background: `linear-gradient(145deg, ${toRgba(dominantColor, 0.22)} 0%, rgba(255, 255, 255, 0.06) 100%)`,
    borderColor: toRgba(dominantColor, 0.2),
    boxShadow: `0 0 40px ${toRgba(dominantColor, 0.18)}`,
    ...style,
  };

  return (
    <div
      className={cn(
        'overflow-hidden border ring-1 ring-white/10',
        className,
      )}
      style={mediaStyle}
      {...props}
    >
      {children}
    </div>
  );
}
