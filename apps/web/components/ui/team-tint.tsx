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
  r: 200,
  g: 168,
  b: 96,
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

/**
 * Editorial team card: flat surface with a 2px tinted left-border drawn
 * from the team's dominant logo color. Replaces the old glassmorphism
 * gradient treatment with a magazine-style sidebar accent.
 */
export function TeamTintCard({
  children,
  className,
  contentClassName,
  elevated: _elevated = false,
  logoUrl,
  style,
  ...props
}: TeamTintCardProps) {
  void _elevated;
  const { dominantColor } = useTeamTint(logoUrl);

  const cardStyle: CSSProperties = {
    borderLeftColor: toRgba(dominantColor, 0.9),
    ...style,
  };

  return (
    <div
      className={cn(
        'relative border border-hairline border-l-2 bg-surface p-5 transition-colors duration-150 hover:bg-surface-hover',
        className,
      )}
      style={cardStyle}
      {...props}
    >
      <div className={cn('relative', contentClassName)}>{children}</div>
    </div>
  );
}

interface TeamTintMediaFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  logoUrl?: string | null | undefined;
}

/**
 * Square media frame for team logos / illustrations. Flat surface with a
 * hairline border tinted by the dominant logo color.
 */
export function TeamTintMediaFrame({
  children,
  className,
  logoUrl,
  style,
  ...props
}: TeamTintMediaFrameProps) {
  const { dominantColor } = useTeamTint(logoUrl);

  const mediaStyle: CSSProperties = {
    borderColor: toRgba(dominantColor, 0.4),
    ...style,
  };

  return (
    <div
      className={cn('overflow-hidden border bg-surface', className)}
      style={mediaStyle}
      {...props}
    >
      {children}
    </div>
  );
}
