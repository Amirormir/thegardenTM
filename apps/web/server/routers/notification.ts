import { z } from 'zod';
import {
  notificationMarkAllReadSchema,
  notificationMarkReadSchema,
} from '@/lib/validators/notification';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

const SELECT_FIELDS = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  isRead: true,
  metadata: true,
  createdAt: true,
} as const;

export const notificationRouter = createTRPCRouter({
  getUnreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.count({
      where: { userId: ctx.session.user.id, isRead: false },
    }),
  ),

  // Last 30 for the bell dropdown (no pagination needed)
  getAll: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: SELECT_FIELDS,
    }),
  ),

  // Paginated history for the /notifications page
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(), // last id for cursor pagination
        onlyUnread: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, onlyUnread } = input;

      let cursorDate: Date | undefined;
      if (cursor) {
        const cursorRow = await ctx.prisma.notification.findUnique({
          where: { id: cursor },
          select: { createdAt: true },
        });
        cursorDate = cursorRow?.createdAt;
      }

      const items = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(onlyUnread ? { isRead: false } : {}),
          ...(cursorDate !== undefined ? { createdAt: { lt: cursorDate } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: SELECT_FIELDS,
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  markRead: protectedProcedure
    .input(notificationMarkReadSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { isRead: true },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure
    .input(notificationMarkAllReadSchema)
    .mutation(async ({ ctx }) => {
      await ctx.prisma.notification.updateMany({
        where: { userId: ctx.session.user.id, isRead: false },
        data: { isRead: true },
      });
      return { success: true };
    }),
});
