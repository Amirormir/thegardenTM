import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
}

export function Input({ className, variant = 'default', ...props }: InputProps) {
  if (variant === 'search') {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          className={cn(
            'h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-text-muted outline-none transition focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/24',
            className,
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-text-muted outline-none transition focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/24',
        className,
      )}
      {...props}
    />
  );
}
