import { adminProcedure, createTRPCRouter } from '@/server/trpc';
import { auditLogSchema } from '@/lib/validators/stats';

export const adminRouter = createTRPCRouter({
  getAuditLog: adminProcedure.input(auditLogSchema).query(({ ctx, input }) =>
    ctx.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ),

  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const [players, teams, contracts, matches, auditLogs, currentSeason] = await Promise.all([
      ctx.prisma.player.count(),
      ctx.prisma.team.count(),
      ctx.prisma.contract.count({
        where: { status: 'ACTIVE' },
      }),
      ctx.prisma.match.count(),
      ctx.prisma.auditLog.count(),
      ctx.prisma.season.findFirst({
        where: { isCurrent: true },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    return {
      players,
      teams,
      activeContracts: contracts,
      matches,
      auditLogs,
      currentSeason,
    };
  }),
});
