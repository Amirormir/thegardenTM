'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  CalendarRange,
  FileText,
  LayoutDashboard,
  Menu,
  Newspaper,
  Shield,
  Sparkles,
  Swords,
  UserCog,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { GardenLogo } from '@/components/ui/garden-logo';
import { cn } from '@/lib/utils/cn';

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: UserCog },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/contracts', label: 'Contracts', icon: FileText },
  { href: '/admin/league', label: 'League', icon: CalendarRange },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/champions', label: 'Champions', icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen border-r border-hairline bg-background px-3 py-6 lg:block',
        collapsed ? 'w-[88px]' : 'w-[260px]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-2',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <GardenLogo imageClassName="h-10 w-10" />
            <p className="label-mono text-foreground-muted">Admin Operations</p>
          </div>
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-hairline bg-surface text-foreground-dim transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-10 flex flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 border-l-2 px-3 py-2.5 transition-colors duration-150',
                active
                  ? 'border-accent bg-surface text-foreground'
                  : 'border-transparent text-foreground-dim hover:bg-surface-hover hover:text-foreground',
                collapsed && 'justify-center',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-accent' : 'text-foreground-muted group-hover:text-foreground-dim',
                )}
              />
              {!collapsed ? <span className="text-sm tracking-tight">{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-hairline pt-4">
        <Link
          href="/"
          className={cn(
            'group flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-foreground-dim transition-colors duration-150 hover:bg-surface-hover hover:text-foreground',
            collapsed && 'justify-center',
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-foreground-muted group-hover:text-foreground-dim" />
          {!collapsed ? (
            <span className="text-sm tracking-tight">Retour au site</span>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}
