import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockPrisma, createPublicCaller, createTestCaller } from '@/test/helpers';

describe('notification router', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  // ─── getUnreadCount ────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns unread notification count', async () => {
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.getUnreadCount();

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });

    it('returns 0 when no unread notifications', async () => {
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.getUnreadCount();

      expect(result).toBe(0);
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.notification.getUnreadCount()).rejects.toThrow(TRPCError);
    });
  });

  // ─── getAll ────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns notifications for the user', async () => {
      const notifications = [
        { id: 'n-1', type: 'TRANSFER_OFFER_RECEIVED', title: 'Test', message: 'Hello', isRead: false, createdAt: new Date() },
        { id: 'n-2', type: 'TRANSFER_ACCEPTED', title: 'Test2', message: 'Hi', isRead: true, createdAt: new Date() },
      ];
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(notifications);

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.getAll();

      expect(result).toEqual(notifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      );
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.notification.getAll()).rejects.toThrow(TRPCError);
    });
  });

  // ─── markRead ──────────────────────────────────────────────────────

  describe('markRead', () => {
    it('marks a notification as read', async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.markRead({ id: 'n-1' });

      expect(result).toEqual({ success: true });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n-1', userId: 'user-1' },
          data: { isRead: true },
        }),
      );
    });

    it('only marks own notifications (scoped by userId)', async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      await caller.notification.markRead({ id: 'n-other-user' });

      // Should only attempt to update for the authenticated user
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n-other-user', userId: 'user-1' },
        }),
      );
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.notification.markRead({ id: 'n-1' })).rejects.toThrow(TRPCError);
    });
  });

  // ─── markAllRead ───────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marks all unread notifications as read', async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.markAllRead({});

      expect(result).toEqual({ success: true });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          data: { isRead: true },
        }),
      );
    });

    it('succeeds even when no unread notifications', async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const { caller } = createTestCaller({ prisma, userId: 'user-1', userRole: 'USER', teamId: null });
      const result = await caller.notification.markAllRead({});

      expect(result).toEqual({ success: true });
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.notification.markAllRead({})).rejects.toThrow(TRPCError);
    });
  });
});
