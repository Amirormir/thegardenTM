import { TeamAvatar } from '@/components/ui/team-avatar';
import { cn } from '@/lib/utils/cn';

interface TeamInlineProps {
  name: string;
  shortCode: string;
  logoUrl?: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
  text?: React.ReactNode;
}

export function TeamInline({
  name,
  shortCode,
  logoUrl,
  size = 'xs',
  className,
  avatarClassName,
  textClassName,
  text,
}: TeamInlineProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 align-middle', className)}>
      <TeamAvatar
        name={name}
        shortCode={shortCode}
        logoUrl={logoUrl}
        size={size}
        className={cn('shrink-0', avatarClassName)}
      />
      <span className={cn('truncate', textClassName)}>{text ?? shortCode}</span>
    </span>
  );
}
