import { TRPCError } from '@trpc/server';
import {
  contractCreateSchema,
  contractPlayerSchema,
  contractTeamSchema,
  contractTerminateSchema,
  contractUpdateSchema,
} from '@/lib/validators/contract';
import { buildAuditLogInput } from '@/server/utils/audit';
import { ensureTeamAccess } from '@/server/utils/authz';
import {
  captainProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';

export const contractRouter = createTRPCRouter({
  getByPlayer: publicProcedure.input(contractPlayerSchema).query(({ ctx, input }) =>
    ctx.prisma.contract.findMany({
      where: { playerId: input.playerId },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        status: true,
        salary: true,
        startDate: true,
        endDate: true,
        transferFee: true,
        releaseClause: true,
        notes: true,
        team: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
      },
    }),
  ),

  getByTeam: captainProcedure.input(contractTeamSchema).query(async ({ ctx, input }) => {
    ensureTeamAccess(ctx.session.user, input.teamId);

    return ctx.prisma.contract.findMany({
      where: { teamId: input.teamId },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
      select: {
        id: true,
        status: true,
        salary: true,
        startDate: true,
        endDate: true,
        player: {
          select: {
            id: true,
            gameName: true,
            role: true,
          },
        },
      },
    });
  }),

  create: captainProcedure.input(contractCreateSchema).mutation(async ({ ctx, input }) => {
    ensureTeamAccess(ctx.session.user, input.teamId);

    const contract = await ctx.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          playerId: input.playerId,
          teamId: input.teamId,
          salary: input.salary,
          startDate: input.startDate,
          endDate: input.endDate,
          ...(input.status ? { status: input.status } : {}),
          ...(input.transferFee !== undefined ? { transferFee: input.transferFee } : {}),
          ...(input.releaseClause !== undefined ? { releaseClause: input.releaseClause } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
        },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          status: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Contract',
          entityId: created.id,
          details: {
            playerId: created.playerId,
            teamId: created.teamId,
            status: created.status,
          },
        }),
      });

      return created;
    });

    return contract;
  }),

  update: captainProcedure.input(contractUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
        status: true,
        salary: true,
        endDate: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
    }

    ensureTeamAccess(ctx.session.user, existing.teamId);

    return ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: {
          ...(data.playerId ? { playerId: data.playerId } : {}),
          ...(data.teamId ? { teamId: data.teamId } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.salary !== undefined ? { salary: data.salary } : {}),
          ...(data.startDate ? { startDate: data.startDate } : {}),
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.transferFee !== undefined ? { transferFee: data.transferFee } : {}),
          ...(data.releaseClause !== undefined ? { releaseClause: data.releaseClause } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
        },
        select: {
          id: true,
          teamId: true,
          status: true,
          salary: true,
          endDate: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Contract',
          entityId: id,
          details: {
            before: existing,
            after: updated,
          },
        }),
      });

      return updated;
    });
  }),

  terminate: captainProcedure
    .input(contractTerminateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contract.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          teamId: true,
          status: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
      }

      ensureTeamAccess(ctx.session.user, existing.teamId);

      return ctx.prisma.$transaction(async (tx) => {
        const terminated = await tx.contract.update({
          where: { id: input.id },
          data: {
            status: 'TERMINATED',
            terminatedAt: input.terminatedAt ?? new Date(),
            ...(input.reason ? { notes: input.reason } : {}),
          },
          select: {
            id: true,
            teamId: true,
            status: true,
            terminatedAt: true,
          },
        });

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'TERMINATE',
            entity: 'Contract',
            entityId: input.id,
            details: {
              previousStatus: existing.status,
              newStatus: terminated.status,
              reason: input.reason ?? null,
            },
          }),
        });

        return terminated;
      });
    }),
});
