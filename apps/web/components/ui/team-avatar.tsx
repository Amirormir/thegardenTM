import { cn } from '@/lib/utils/cn';

interface TeamAvatarProps {
  name: string;
  shortCode: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-9 w-9 rounded-xl text-[0.65rem]',
  md: 'h-12 w-12 rounded-2xl text-sm',
  lg: 'h-16 w-16 rounded-[22px] text-base',
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
          'object-cover ring-1 ring-white/10',
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-white/8 font-display font-bold text-white ring-1 ring-white/10',
        sizeStyles[size],
        className,
      )}
    >
      {shortCode.slice(0, 3).toUpperCase()}
    </div>
  );
}
