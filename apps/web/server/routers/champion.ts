import { TRPCError } from '@trpc/server';
import {
  championIdSchema,
  championListInputSchema,
  championSyncSchema,
  championUpdateSchema,
} from '@/lib/validators/champion';
import { syncChampionsToDatabase } from '@/lib/riot/data-dragon';
import { buildAuditLogInput } from '@/server/utils/audit';
import { adminProcedure, createTRPCRouter, publicProcedure } from '@/server/trpc';

const championSelect = {
  id: true,
  name: true,
  title: true,
  roles: true,
  splashUrl: true,
  squareUrl: true,
  patchVersion: true,
  enabled: true,
  updatedAt: true,
} as const;

export const championRouter = createTRPCRouter({
  list: publicProcedure.input(championListInputSchema).query(async ({ ctx, input }) => {
    const onlyEnabled = input?.onlyEnabled ?? true;
    const search = input?.search?.trim();

    return ctx.prisma.champion.findMany({
      where: {
        ...(onlyEnabled ? { enabled: true } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      select: championSelect,
    });
  }),

  getById: publicProcedure.input(championIdSchema).query(async ({ ctx, input }) => {
    const champion = await ctx.prisma.champion.findUnique({
      where: { id: input.id },
      select: championSelect,
    });

    if (!champion) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Champion introuvable.' });
    }

    return champion;
  }),

  adminList: adminProcedure.query(({ ctx }) =>
    ctx.prisma.champion.findMany({
      orderBy: { name: 'asc' },
      select: championSelect,
    }),
  ),

  update: adminProcedure.input(championUpdateSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.champion.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, roles: true, enabled: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Champion introuvable.' });
    }

    return ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.champion.update({
        where: { id: input.id },
        data: {
          ...(input.roles ? { roles: input.roles } : {}),
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        },
        select: championSelect,
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Champion',
          entityId: input.id,
          details: {
            name: existing.name,
            before: { roles: existing.roles, enabled: existing.enabled },
            after: { roles: updated.roles, enabled: updated.enabled },
          },
        }),
      });

      return updated;
    });
  }),

  syncFromRiot: adminProcedure.input(championSyncSchema).mutation(async ({ ctx }) => {
    const result = await syncChampionsToDatabase({ prisma: ctx.prisma });

    await ctx.prisma.auditLog.create({
      data: buildAuditLogInput({
        userId: ctx.session.user.id,
        action: 'SYNC',
        entity: 'Champion',
        entityId: 'all',
        details: {
          patchVersion: result.patchVersion,
          total: result.total,
          inserted: result.inserted,
          updated: result.updated,
        },
      }),
    });

    return result;
  }),
});
