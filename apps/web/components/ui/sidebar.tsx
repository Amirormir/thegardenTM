'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  Menu,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/league', label: 'League', icon: CalendarRange },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen border-r border-white/8 bg-[#0d0b13]/82 px-3 py-5 backdrop-blur-xl lg:block',
        collapsed ? 'w-[92px]' : 'w-[280px]',
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="rounded-2xl border border-accent-primary/20 bg-accent-primary/12 p-3 text-accent-glow">
            <BarChart3 className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div>
              <p className="font-display text-lg font-bold text-white">Nexus Admin</p>
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Operations hub
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/5 p-2 text-text-secondary transition hover:text-white"
          onClick={() => setCollapsed((value) => !value)}
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 transition',
                active
                  ? 'bg-accent-primary/16 text-white shadow-[0_0_30px_rgba(124,58,237,0.16)]'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span className="text-sm font-medium">{label}</span> : null}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
