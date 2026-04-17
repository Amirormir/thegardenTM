import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/70 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-primary text-white shadow-[0_0_22px_rgba(124,58,237,0.28)] hover:-translate-y-0.5 hover:bg-[#8b5cf6]',
        secondary:
          'border border-white/[0.08] bg-white/[0.05] text-white hover:border-accent-primary/30 hover:bg-accent-primary/[0.1] hover:shadow-[0_0_18px_rgba(168,85,247,0.12)]',
        ghost:
          'border border-transparent bg-transparent text-text-secondary hover:border-white/[0.05] hover:bg-white/[0.035] hover:text-white',
        danger:
          'bg-rose-500/16 text-rose-100 ring-1 ring-rose-400/25 hover:bg-rose-500/24 hover:shadow-[0_0_28px_rgba(244,63,94,0.2)]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
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
