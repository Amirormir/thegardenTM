import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface PlayerLinkProps {
  playerId: string;
  children: ReactNode;
  className?: string;
}

export function PlayerLink({ playerId, children, className }: PlayerLinkProps) {
  return (
    <Link
      href={`/transfermarket/${playerId}`}
      className={cn(
        'underline-offset-4 transition-colors duration-150 hover:text-accent hover:underline focus-visible:outline-none focus-visible:underline',
        className,
      )}
    >
      {children}
    </Link>
  );
}
