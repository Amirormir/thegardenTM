'use client';

import { Bell, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "a l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

const TYPE_ICON: Record<string, string> = {
  TRANSFER_OFFER_RECEIVED: '📩',
  TRANSFER_ACCEPTED: '✅',
  TRANSFER_REJECTED: '❌',
  TRANSFER_COUNTER_PROPOSED: '🔄',
  TRANSFER_AUTO_ACCEPTED: '⚡',
  TRANSFER_CLAUSE_TRIGGERED: '⚠️',
  CONTRACT_APPROVED: '📋',
};

export function NotificationBell() {
  const utils = api.useUtils();
  const countQuery = api.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const allQuery = api.notification.getAll.useQuery(undefined, { enabled: false });
  const markAllRead = api.notification.markAllRead.useMutation();

  const [open, setOpen] = useState(false);
  const autoReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = countQuery.data ?? 0;
  const notifications = allQuery.data ?? [];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Auto-mark all as read 2s after opening if there are unread
  useEffect(() => {
    if (open && unreadCount > 0) {
      autoReadTimer.current = setTimeout(async () => {
        await markAllRead.mutateAsync({});
        await Promise.all([
          countQuery.refetch(),
          allQuery.refetch(),
        ]);
      }, 2000);
    }
    return () => {
      if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
    };
  }, [open, unreadCount]);

  function handleToggle() {
    if (!open) allQuery.refetch();
    setOpen((prev) => !prev);
  }

  async function handleLinkClick() {
    // Invalidate on navigate
    setOpen(false);
    await utils.notification.getUnreadCount.invalidate();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="relative rounded-2xl border border-white/[0.05] bg-white/[0.035] p-2.5 text-text-secondary transition hover:bg-white/10 hover:text-white"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent-primary text-[0.6rem] font-bold text-white animate-in zoom-in-50 duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-3xl border border-white/[0.05] bg-[#12121A]/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <Link
              href="/notifications"
              className="flex items-center gap-1 text-xs text-accent-glow transition hover:text-white"
              onClick={handleLinkClick}
            >
              <ExternalLink className="h-3 w-3" />
              Historique
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.035]',
                    !notif.isRead && 'bg-accent-primary/5',
                  )}
                >
                  <span className="mt-0.5 text-base leading-none">
                    {TYPE_ICON[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                    <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{notif.message}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[0.65rem] text-text-muted">{timeAgo(notif.createdAt)}</span>
                      {notif.link ? (
                        <Link
                          href={notif.link}
                          className="text-[0.65rem] text-accent-glow hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Voir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {!notif.isRead ? (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary" />
                  ) : null}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-xs text-text-secondary">
                Aucune notification.
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.05] px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              className="text-xs text-text-secondary transition hover:text-white"
              onClick={handleLinkClick}
            >
              Voir tout l'historique →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
