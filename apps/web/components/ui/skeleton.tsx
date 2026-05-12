import { cn } from '@/lib/utils/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('shimmer rounded-2xl bg-white/[0.04]', className)} />;
}

/// k