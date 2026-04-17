import { cn } from '@/lib/utils/cn';

interface TeamAvatarProps {
  name: string;
  shortCode: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-9 w-9 rounded-full text-[0.6rem]',
  md: 'h-12 w-12 rounded-full text-xs',
  lg: 'h-16 w-16 rounded-full text-sm',
} as const;

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
        className={cn(
          'object-cover ring-1 ring-white/[0.06]',
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-600/10 font-display font-bold text-white/80 ring-1 ring-white/[0.06]',
        sizeStyles[size],
        className,
      )}
    >
      {shortCode.slice(0, 3).toUpperCase()}
    </div>
  );
}
