'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const CUSTOM_LINKS = [
  { href: '/custom/saison-1', label: 'Saison 1' },
  { href: '/custom/saison-2', label: 'Saison 2' },
] as const;

export function CustomSubNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Sections custom"
      className="flex items-center gap-1 overflow-x-auto border-b border-hairline"
    >
      {CUSTOM_LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative whitespace-nowrap px-4 py-3 label-mono transition-colors duration-150',
              active
                ? 'bg-surface text-foreground'
                : 'text-foreground-dim hover:bg-surface-hover hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
