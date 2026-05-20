'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export interface StatsFilterGroup<T extends string> {
  // URL param key. Setting to the default value removes the param from the URL.
  key: string;
  label: string;
  options: FilterOption<T>[];
  defaultValue: T;
}

export interface StatsFilterBarProps {
  // Order matters — first group renders first.
  groups: StatsFilterGroup<string>[];
  // Path the filter bar lives on. Used for replace() so other query params
  // (tab, sort) stay intact when filters change.
  basePath: string;
}

/**
 * URL-synced filter bar. Reads filter values from `useSearchParams` and
 * pushes changes via `router.replace`, preserving any other params (sort, tab)
 * that aren't owned by this bar. Default values are stripped from the URL so
 * the canonical "no filter" URL has no query string at all.
 */
export function StatsFilterBar({ groups, basePath }: StatsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of groups) {
      map[group.key] = searchParams.get(group.key) ?? group.defaultValue;
    }
    return map;
  }, [groups, searchParams]);

  const setValue = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [basePath, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <p className="label-mono">§ {group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const active = currentValues[group.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue(group.key, option.value, group.defaultValue)}
                  className={cn(
                    'border px-3 py-1.5 label-mono transition-colors duration-150',
                    active
                      ? 'border-accent bg-surface text-foreground'
                      : 'border-hairline bg-background text-foreground-dim hover:bg-surface-hover hover:text-foreground',
                  )}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
