import { cn } from '@/lib/utils/cn';

interface TeamAvatarProps {
  name: string;
  shortCode: string;
  logoUrl?: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  xs: 'h-5 w-5 text-[0.45rem]',
  sm: 'h-7 w-7 text-[0.55rem]',
  md: 'h-10 w-10 text-[0.65rem]',
  lg: 'h-14 w-14 text-xs',
} as const;

function teamHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function TeamAvatar({
  name,
  shortCode,
  logoUrl,
  size = 'md',
  className,
}: TeamAvatarProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        className={cn(
          'rounded-sm border border-hairline object-cover',
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  const hue = teamHue(name);

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-sm font-mono font-semibold uppercase tracking-[0.04em]',
        sizeStyles[size],
        className,
      )}
      style={{
        background: `oklch(0.32 0.06 ${hue})`,
        color: `oklch(0.92 0.04 ${hue})`,
      }}
    >
      {shortCode.slice(0, 3).toUpperCase()}
    </div>
  );
}
