import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/10">
      <div className="max-h-[520px] overflow-auto">
        <table className={cn('min-w-full border-separate border-spacing-0', className)} {...props} />
      </div>
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-[#151421]/95 backdrop-blur-sm', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-white/6', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition odd:bg-white/[0.015] hover:bg-accent-primary/[0.065]',
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
        'px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-text-secondary',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-4 text-sm text-slate-100', className)} {...props} />;
}
