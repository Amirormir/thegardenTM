import Image from 'next/image';
import gardenLogo from '@/app/(public)/logo.png';
import { cn } from '@/lib/utils/cn';

interface GardenLogoProps {
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
}

export function GardenLogo({
  className,
  imageClassName,
  labelClassName,
  showLabel = true,
}: GardenLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src={gardenLogo}
        alt="Garden"
        className={cn('h-9 w-9 object-contain', imageClassName)}
        priority
      />
      {showLabel ? (
        <span className={cn('label-mono-strong text-foreground', labelClassName)}>Garden</span>
      ) : null}
    </span>
  );
}
