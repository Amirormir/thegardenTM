import Image from 'next/image';
import bloomImage from '@/app/(public)/rank/bloom.png';
import crownImage from '@/app/(public)/rank/crown.png';
import edenImage from '@/app/(public)/rank/eden.png';
import heavenImage from '@/app/(public)/rank/heaven.png';
import seedImage from '@/app/(public)/rank/seed.png';
import sproutImage from '@/app/(public)/rank/sprout.png';
import thornImage from '@/app/(public)/rank/thorn.png';
import type { CustomRankKey } from '@/lib/custom/ranks';
import { cn } from '@/lib/utils/cn';

const rankImages: Record<CustomRankKey, typeof seedImage> = {
  Seed: seedImage,
  Sprout: sproutImage,
  Bloom: bloomImage,
  Thorn: thornImage,
  Crown: crownImage,
  Eden: edenImage,
  Heaven: heavenImage,
};

interface CustomRankBadgeProps {
  tier: CustomRankKey | 'Placements';
  subDivision?: string | null;
  displayScore?: number | null;
  placementPreview?:
    | {
        tier: CustomRankKey;
        subDivision?: string | null;
        displayScore?: number | null;
      }
    | null;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CustomRankBadge({
  tier,
  subDivision = null,
  displayScore = null,
  placementPreview = null,
  showScore = false,
  size = 'sm',
  className,
}: CustomRankBadgeProps) {
  if (tier === 'Placements') {
    return (
      <span
        className={cn(
          'inline-flex items-center border border-hairline px-2 py-1 label-mono text-foreground-dim',
        className,
      )}
    >
        <span className="flex flex-col text-left">
          <span>Placements</span>
          {placementPreview ? (
            <span className="text-[10px] text-foreground">
              {placementPreview.tier}
              {placementPreview.subDivision ? ` ${placementPreview.subDivision}` : ''}
              {showScore && placementPreview.displayScore != null
                ? ` · ${placementPreview.displayScore}/100`
                : ''}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  const image = rankImages[tier];
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }[size];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image src={image} alt={tier} className={cn('object-contain', sizeClass)} />
      <span className="flex flex-col">
        <span className="text-sm text-foreground">
          {tier}
          {subDivision ? ` ${subDivision}` : ''}
        </span>
        {showScore && displayScore != null ? (
          <span className="label-mono">{displayScore}/100</span>
        ) : null}
      </span>
    </span>
  );
}
