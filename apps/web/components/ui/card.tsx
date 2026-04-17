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
        elevated ? 'glass-card-elevated panel-outline' : 'glass-card',
        'border border-white/[0.05] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.1]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
