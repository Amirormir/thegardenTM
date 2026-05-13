import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  children: ReactNode;
}

export function Card({ className, elevated = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border bg-surface p-5 transition-colors duration-150',
        elevated ? 'border-hairline-strong' : 'border-hairline',
        'hover:bg-surface-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
