import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden">
      <div className="max-h-[640px] overflow-auto">
        <table
          className={cn('min-w-full border-separate border-spacing-0', className)}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-background', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        '[&>td]:border-t [&>td]:border-hairline transition-colors duration-150 hover:bg-surface-hover',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-hairline px-5 py-3 text-left label-mono',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-5 py-4 text-sm text-foreground', className)} {...props} />
  );
}
