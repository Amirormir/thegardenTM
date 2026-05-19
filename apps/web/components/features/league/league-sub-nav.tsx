'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const LEAGUE_LINKS = [
  { href: '/league', label: 'Classement' },
  { href: '/league/matches', label: 'Matchs' },
  { href: '/league/historique', label: 'Historique' },
  { href: '/league/stats', label: 'Statistiques' },
  { href: '/league/rulebook', label: 'Rulebook' },
] as const;

export function LeagueSubNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/league') return pathname === '/league';
    return pathname.startsWith(href);
  }

  return (
    <nav
      aria-label="Sections league"
      className="flex items-center gap-6 overflow-x-auto border-b border-hairline"
    >
      {LEAGUE_LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative whitespace-nowrap pb-3 text-sm transition-colors duration-150',
              active
                ? 'text-foreground'
                : 'text-foreground-dim hover:text-foreground',
            )}
          >
            {link.label}
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-px bg-accent"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
