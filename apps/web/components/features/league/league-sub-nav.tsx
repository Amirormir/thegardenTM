'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const LEAGUE_LINKS = [
  { href: '/league', label: 'Classement' },
  { href: '/league/matches', label: 'Matchs' },
  { href: '/league/historique', label: 'Historique' },
  { href: '/league/stats', label: 'Statistiques' },
] as const;

export function LeagueSubNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/league') return pathname === '/league';
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-white/8 pb-3">
      {LEAGUE_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition',
            isActive(link.href)
              ? 'bg-white/10 text-white'
              : 'text-text-secondary hover:bg-white/5 hover:text-white',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
