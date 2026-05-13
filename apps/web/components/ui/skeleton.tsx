import { cn } from '@/lib/utils/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('shimmer bg-surface', className)} />;
}
