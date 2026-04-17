'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, Menu, Shield, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { buttonVariants } from './button';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils/cn';

interface NavbarUser {
  id: string;
  name?: string | null;
  image?: string | null;
  role: string;
  teamId: string | null;
}

interface NavbarClientProps {
  user: NavbarUser | null;
}

function isNavItemActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === '/team') {
    return pathname === '/team' || (pathname.startsWith('/team/') && !pathname.startsWith('/team/contracts'));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarClient({ user }: NavbarClientProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const signInHref = useMemo(() => {
    if (!pathname) {
      return '/api/auth/signin';
    }

    const params = new URLSearchParams({ callbackUrl: pathname });
    return `/api/auth/signin?${params.toString()}`;
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [session?.user?.image, user?.image]);

  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        role: String(session.user.role),
        teamId: session.user.teamId,
      }
    : user;

  const userName = currentUser?.name ?? 'Guest';
  const userRole = currentUser?.role ?? 'USER';
  const showAvatar = Boolean(currentUser?.image) && !avatarLoadFailed;
  const navItems = useMemo(() => {
    const items = [
      { href: '/', label: 'Home' },
      { href: '/transfermarket', label: 'Transfermarket' },
      { href: '/league', label: 'League' },
    ];

    if (currentUser?.teamId) {
      items.push(
        { href: '/team', label: 'Team' },
        { href: '/team/contracts', label: 'Contracts' },
      );
    }

    return items;
  }, [currentUser?.teamId]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0b0a10]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-primary/[0.12] bg-accent-primary/[0.08] font-display text-base font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.16)]">
            G
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-white">Garden</div>
            <div className="text-xs uppercase tracking-[0.06em] text-text-secondary">
              League Manager
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                isNavItemActive(pathname, item.href)
                  ? 'bg-white/10 text-white'
                  : 'text-text-secondary hover:text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-2.5 text-text-secondary transition hover:text-white md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {currentUser ? <NotificationBell /> : null}

          <div className="relative">
            {currentUser ? (
              <>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-accent-primary/30"
                  onClick={() => setOpen((value) => !value)}
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-accent-primary/20 text-accent-glow">
                    {showAvatar ? (
                      <img
                        src={currentUser?.image ?? undefined}
                        alt={userName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarLoadFailed(true)}
                      />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block font-semibold">{userName}</span>
                    <span className="block text-xs uppercase tracking-[0.06em] text-text-secondary">
                      {userRole}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                </button>
                {open ? (
                  <div className="absolute right-0 mt-3 w-56 rounded-[24px] border border-white/[0.06] bg-[#151421]/95 p-2 shadow-2xl backdrop-blur-xl">
                    <Link
                      href="/profile"
                      className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Mon profil
                    </Link>
                    <Link
                      href="/notifications"
                      className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Notifications
                    </Link>
                    {currentUser.teamId ? (
                      <>
                        <Link
                          href="/team"
                          className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                          onClick={() => setOpen(false)}
                        >
                          Team Dashboard
                        </Link>
                        <Link
                          href="/team/contracts"
                          className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                          onClick={() => setOpen(false)}
                        >
                          Team Contracts
                        </Link>
                      </>
                    ) : null}
                    {currentUser.role === 'ADMIN' ? (
                      <Link
                        href="/admin"
                        className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
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
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'inline-flex items-center',
                  )}
                >
                  S&apos;inscrire
                </Link>
                <Link
                  href={signInHref}
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                    'inline-flex items-center',
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Connexion
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-[#0e0d15]/95 backdrop-blur-xl md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-5">
                <div className="font-display text-lg font-bold tracking-tight text-white">Garden</div>
                <button
                  type="button"
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-2 text-text-secondary transition hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-2xl px-4 py-3 text-sm font-medium transition',
                      isNavItemActive(pathname, item.href)
                        ? 'bg-accent-primary/14 text-white'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-white',
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {currentUser?.role === 'ADMIN' ? (
                  <Link
                    href="/admin"
                    className={cn(
                      'block rounded-2xl px-4 py-3 text-sm font-medium transition',
                      pathname.startsWith('/admin')
                        ? 'bg-accent-primary/14 text-white'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-white',
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin Area
                  </Link>
                ) : null}
              </div>

              <div className="border-t border-white/[0.06] px-3 py-4">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-accent-primary/20 text-accent-glow">
                        {showAvatar ? (
                          <img
                            src={currentUser?.image ?? undefined}
                            alt={userName}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarLoadFailed(true)}
                          />
                        ) : (
                          <UserRound className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{userName}</p>
                        <p className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                          {userRole}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Mon profil
                    </Link>
                    <Link
                      href="/notifications"
                      className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Notifications
                    </Link>
                    {currentUser.teamId ? (
                      <Link
                        href="/team/contracts"
                        className="block rounded-2xl px-4 py-3 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                        onClick={() => setMobileOpen(false)}
                      >
                        Team Contracts
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-rose-200 transition hover:bg-rose-500/10"
                      onClick={() => void signOut({ callbackUrl: '/' })}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/register"
                      className="block rounded-2xl bg-accent-primary/14 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-accent-primary/20"
                      onClick={() => setMobileOpen(false)}
                    >
                      S&apos;inscrire
                    </Link>
                    <Link
                      href={signInHref}
                      className="block rounded-2xl px-4 py-3 text-center text-sm font-medium text-text-secondary transition hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Connexion
                    </Link>
                  </div>
                )}
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
