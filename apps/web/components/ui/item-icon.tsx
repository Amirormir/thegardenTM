'use client';

import { useState } from 'react';
import { getItemIconUrl } from '@/lib/utils/ddragon';
import { cn } from '@/lib/utils/cn';

interface ItemIconProps {
  itemId: number;
  size?: 'xs' | 'sm' | 'md';
  isTrinket?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
} as const;

export function ItemIcon({ itemId, size = 'sm', isTrinket = false, className }: ItemIconProps) {
  const [errored, setErrored] = useState(false);
  const url = getItemIconUrl(itemId);

  const baseClasses = cn(
    'inline-block overflow-hidden border border-hairline bg-background',
    isTrinket ? 'rounded-full' : 'rounded-sm',
    SIZE_CLASSES[size],
    className,
  );

  if (!url || errored) {
    return (
      <span
        className={cn(baseClasses, 'bg-surface')}
        aria-label={itemId ? `Item ${itemId}` : 'Slot vide'}
        title={itemId ? `Item ${itemId}` : 'Slot vide'}
      />
    );
  }

  return (
    <span className={baseClasses} aria-label={`Item ${itemId}`} title={`Item ${itemId}`}>
      <img
        src={url}
        alt={`Item ${itemId}`}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

interface ItemRowProps {
  items: number[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ItemRow({ items, size = 'sm', className }: ItemRowProps) {
  const slots = Array.from({ length: 7 }, (_, index) => items[index] ?? 0);
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {slots.map((itemId, index) => (
        <ItemIcon
          key={index}
          itemId={itemId}
          size={size}
          isTrinket={index === 6}
        />
      ))}
    </span>
  );
}
