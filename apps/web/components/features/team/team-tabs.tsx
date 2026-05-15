'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const tabs = [
  { href: '/team', label: 'Effectif' },
  { href: '/team/budget', label: 'Budget' },
] as const;

export function TeamTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 border-b border-hairline">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative -mb-px inline-flex items-center px-4 py-3 label-mono transition-colors',
              active
                ? 'border-b-2 border-accent text-foreground'
                : 'border-b-2 border-transparent text-foreground-dim hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
