'use client';

import { Bell, CheckCheck, Filter, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

const TYPE_LABEL: Record<string, string> = {
  TRANSFER_OFFER_RECEIVED: 'Offre reçue',
  TRANSFER_ACCEPTED: 'Offre acceptée',
  TRANSFER_REJECTED: 'Offre refusée',
  TRANSFER_COUNTER_PROPOSED: 'Contre-offre',
  TRANSFER_AUTO_ACCEPTED: 'Auto-acceptée',
  TRANSFER_CLAUSE_TRIGGERED: 'Clause activée',
  CONTRACT_APPROVED: 'Contrat approuvé',
};

export default function NotificationsPage() {
  const utils = api.useUtils();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const query = api.notification.getHistory.useInfiniteQuery(
    { limit: 20, onlyUnread },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notification.getHistory.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
      ]);
    },
  });

  const markRead = api.notification.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notification.getHistory.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
      ]);
    },
  });

  const allItems = query.data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = allItems.some((n) => !n.isRead);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16 md:gap-20">
      <header className="flex items-end justify-between gap-6 border-b border-hairline pb-8">
        <div>
          <p className="breadcrumb-mono">§ · Compte · Notifications</p>
          <h1 className="mt-4 display-lg text-foreground">Centre de notifications.</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setOnlyUnread((v) => !v)}
            className={cn(onlyUnread && 'border-accent text-accent')}
          >
            {onlyUnread ? 'Non lues' : 'Toutes'}
          </Button>
          {hasUnread ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={
                markAllRead.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )
              }
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate({})}
            >
              Tout marquer lu
            </Button>
          ) : null}
        </div>
      </header>

      <section className="border-y border-hairline">
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 label-mono text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-foreground-dim">
            <Bell className="h-8 w-8 text-foreground-muted" />
            <p className="label-mono">Aucune notification{onlyUnread ? ' non lue' : ''}.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {allItems.map((notif) => (
              <li
                key={notif.id}
                className={cn(
                  'flex items-start gap-6 px-2 py-5 transition',
                  !notif.isRead && 'border-l-2 border-l-accent pl-4',
                )}
              >
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="label-mono text-foreground-muted">
                      {TYPE_LABEL[notif.type] ?? 'Notification'}
                    </p>
                    <span className="label-mono text-foreground-muted">·</span>
                    <p className="label-mono text-foreground-muted tabular-nums">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  <p className="font-display text-lg tracking-tight text-foreground">
                    {notif.title}
                  </p>
                  <p className="text-sm leading-6 text-foreground-dim">{notif.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {!notif.isRead ? (
                    <button
                      type="button"
                      className="label-mono text-foreground-dim transition hover:text-accent"
                      onClick={() => markRead.mutate({ id: notif.id })}
                    >
                      Marquer lu
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {query.hasNextPage ? (
          <div className="flex justify-center border-t border-hairline py-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={query.isFetchingNextPage}
              icon={query.isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
              onClick={() => query.fetchNextPage()}
            >
              Charger plus
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
