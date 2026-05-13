import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'rounded-full bg-accent text-background hover:bg-accent-dim',
        secondary:
          'rounded-full border border-hairline bg-surface text-foreground hover:bg-surface-hover hover:border-hairline-strong',
        ghost:
          'rounded-full bg-transparent text-foreground-dim hover:bg-surface hover:text-foreground',
        link:
          'rounded-none text-foreground underline-offset-4 hover:text-accent hover:underline',
        danger:
          'rounded-full border border-hairline bg-surface text-[color:var(--loss)] hover:bg-surface-hover hover:border-[color:var(--loss)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
