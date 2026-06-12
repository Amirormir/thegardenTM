import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { adminProcedure, createTRPCRouter } from '@/server/trpc';
import { auditLogSchema } from '@/lib/validators/stats';
import { bettingAdminRouter } from './betting-admin';

const DASHBOARD_STATS_TTL_SECONDS = 60;

const getCachedDashboardStats = unstable_cache(
  async () => {
    const [players, teams, contracts, matches, auditLogs, currentSeason] = await Promise.all([
      prisma.player.count(),
      prisma.team.count(),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.match.count(),
      prisma.auditLog.count(),
      prisma.season.findFirst({
        where: { isCurrent: true },
        select: { id: true, name: true },
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
  },
  ['admin-dashboard-stats'],
  { revalidate: DASHBOARD_STATS_TTL_SECONDS, tags: ['admin-dashboard-stats'] },
);

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

  getDashboardStats: adminProcedure.query(() => getCachedDashboardStats()),

  betting: bettingAdminRouter,
});
