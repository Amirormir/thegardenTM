'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

const TYPE_LABEL: Record<string, string> = {
  TRANSFER_OFFER_RECEIVED: 'Offre',
  TRANSFER_ACCEPTED: 'Accepté',
  TRANSFER_REJECTED: 'Refusé',
  TRANSFER_COUNTER_PROPOSED: 'Contre-offre',
  TRANSFER_AUTO_ACCEPTED: 'Auto',
  TRANSFER_CLAUSE_TRIGGERED: 'Clause',
  CONTRACT_APPROVED: 'Contrat',
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

  useEffect(() => {
    if (open && unreadCount > 0) {
      autoReadTimer.current = setTimeout(() => {
        void (async () => {
          await markAllRead.mutateAsync({});
          await Promise.all([countQuery.refetch(), allQuery.refetch()]);
        })();
      }, 2000);
    }
    return () => {
      if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
    };
  }, [open, unreadCount]);

  function handleToggle() {
    if (!open) {
      void allQuery.refetch();
    }
    setOpen((prev) => !prev);
  }

  function handleLinkClick() {
    setOpen(false);
    void utils.notification.getUnreadCount.invalidate();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center border border-hairline bg-surface text-foreground-dim transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center bg-accent px-1 text-[10px] font-medium text-background tabular-nums"
            aria-label={`${unreadCount} notifications non lues`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 border border-hairline bg-surface"
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <p className="label-mono-strong text-foreground">Notifications</p>
            <Link
              href="/notifications"
              className="label-mono text-foreground-muted transition-colors duration-150 hover:text-accent"
              onClick={handleLinkClick}
            >
              Historique →
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-3 border-b border-hairline px-4 py-3 transition-colors duration-150 hover:bg-surface-hover',
                    !notif.isRead && 'border-l-2 border-l-accent pl-[14px]',
                  )}
                >
                  <span className="mt-0.5 label-mono text-foreground-muted whitespace-nowrap">
                    {TYPE_LABEL[notif.type] ?? 'Info'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{notif.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground-dim">
                      {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 label-mono text-foreground-muted">
                      <span>{timeAgo(notif.createdAt)}</span>
                      {notif.link ? (
                        <Link
                          href={notif.link}
                          className="text-foreground-dim transition-colors duration-150 hover:text-accent"
                          onClick={() => setOpen(false)}
                        >
                          Voir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-foreground-muted">
                Aucune notification.
              </div>
            )}
          </div>

          <div className="border-t border-hairline px-4 py-3 text-center">
            <Link
              href="/notifications"
              className="label-mono text-foreground-muted transition-colors duration-150 hover:text-accent"
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
