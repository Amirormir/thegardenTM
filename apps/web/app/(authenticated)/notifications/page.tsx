'use client';

import { Bell, CheckCheck, Filter, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "A l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-kicker">Centre de notifications</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setOnlyUnread((v) => !v)}
            className={cn(onlyUnread && 'border-accent-primary/50 bg-accent-primary/10 text-accent-glow')}
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
      </div>

      <Card className="divide-y divide-white/5 p-0 overflow-hidden">
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-text-secondary">
            <Bell className="h-8 w-8 opacity-30" />
            <p>Aucune notification{onlyUnread ? ' non lue' : ''}.</p>
          </div>
        ) : (
          allItems.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-4 px-5 py-4 transition hover:bg-white/5',
                !notif.isRead && 'bg-accent-primary/5',
              )}
            >
              <span className="mt-0.5 text-xl leading-none shrink-0">
                {TYPE_ICON[notif.type] ?? '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{notif.title}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{notif.message}</p>
                <p className="mt-1.5 text-xs text-text-muted">{timeAgo(notif.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!notif.isRead ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-accent-primary" />
                    <button
                      type="button"
                      className="text-xs text-text-secondary transition hover:text-white"
                      onClick={() => markRead.mutate({ id: notif.id })}
                    >
                      Marquer lu
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}

        {query.hasNextPage ? (
          <div className="flex justify-center py-4">
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
      </Card>
    </div>
  );
}
