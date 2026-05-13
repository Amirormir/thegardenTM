import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
}

const baseInput =
  'h-10 w-full border border-hairline bg-surface px-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors duration-150 focus:border-accent';

export function Input({ className, variant = 'default', ...props }: InputProps) {
  if (variant === 'search') {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <input
          className={cn(baseInput, 'rounded-full pl-10 pr-4', className)}
          {...props}
        />
      </div>
    );
  }

  return <input className={cn(baseInput, className)} {...props} />;
}
