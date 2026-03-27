'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ChevronDown, Shield, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buttonVariants } from './button';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/transfermarket', label: 'Transfermarket' },
  { href: '/league', label: 'League' },
  { href: '/team', label: 'Team' },
];

interface NavbarUser {
  id: string;
  name?: string | null;
  role: string;
  teamId: string | null;
}

interface NavbarClientProps {
  user: NavbarUser | null;
}

export function NavbarClient({ user }: NavbarClientProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const signInHref = useMemo(() => {
    if (!pathname) {
      return '/api/auth/signin';
    }

    const params = new URLSearchParams({ callbackUrl: pathname });
    return `/api/auth/signin?${params.toString()}`;
  }, [pathname]);

  const userName = user?.name ?? 'Guest';
  const userRole = user?.role ?? 'USER';

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0a10]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-primary/12 font-display text-lg font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.24)]">
            NL
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">Nexus League</div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-secondary">
              Competitive ecosystem
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/4 p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-white/10 text-white'
                  : 'text-text-secondary hover:text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative">
          {user ? (
            <>
              <button
                type="button"
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-accent-primary/30"
                onClick={() => setOpen((value) => !value)}
              >
                <span className="rounded-full bg-accent-primary/20 p-2 text-accent-glow">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="hidden text-left md:block">
                  <span className="block font-semibold">{userName}</span>
                  <span className="block text-xs uppercase tracking-[0.18em] text-text-secondary">
                    {userRole}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              </button>
              {open ? (
                <div className="absolute right-0 mt-3 w-56 rounded-[24px] border border-white/10 bg-[#151421]/95 p-2 shadow-2xl backdrop-blur-xl">
                  <Link
                    href="/team"
                    className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/6 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Team Dashboard
                  </Link>
                  {user.role === 'ADMIN' ? (
                    <Link
                      href="/admin"
                      className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/6 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Admin Area
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="mt-1 w-full rounded-2xl px-4 py-3 text-left text-sm text-rose-200 transition hover:bg-rose-500/10"
                    onClick={() => void signOut({ callbackUrl: '/' })}
                  >
                    Disconnect
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <Link
              href={signInHref}
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'inline-flex items-center',
              )}
            >
              <Shield className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
