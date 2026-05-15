import { leagueSettingsUpdateSchema } from '@/lib/validators/league-settings';
import { buildAuditLogInput } from '@/server/utils/audit';
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';

const LEAGUE_SETTINGS_ID = 1;

const DEFAULT_SETTINGS = {
  id: LEAGUE_SETTINGS_ID,
  boMaxRegularSeason: 18,
  transferWindowOpen: true,
  transferWindowStart: null,
  transferWindowEnd: null,
  contractExpiryNoticeDays: 30,
} as const;

export const leagueSettingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.leagueSettings.findUnique({
      where: { id: LEAGUE_SETTINGS_ID },
    });

    if (settings) return settings;

    return ctx.prisma.leagueSettings.upsert({
      where: { id: LEAGUE_SETTINGS_ID },
      create: { ...DEFAULT_SETTINGS },
      update: {},
    });
  }),

  update: adminProcedure
    .input(leagueSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.prisma.leagueSettings.upsert({
        where: { id: LEAGUE_SETTINGS_ID },
        create: { ...DEFAULT_SETTINGS },
        update: {},
      });

      const data: Record<string, unknown> = {};
      if (input.boMaxRegularSeason !== undefined) data.boMaxRegularSeason = input.boMaxRegularSeason;
      if (input.transferWindowOpen !== undefined) data.transferWindowOpen = input.transferWindowOpen;
      if (input.transferWindowStart !== undefined) data.transferWindowStart = input.transferWindowStart;
      if (input.transferWindowEnd !== undefined) data.transferWindowEnd = input.transferWindowEnd;
      if (input.contractExpiryNoticeDays !== undefined)
        data.contractExpiryNoticeDays = input.contractExpiryNoticeDays;

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.leagueSettings.update({
          where: { id: LEAGUE_SETTINGS_ID },
          data,
        });

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'UPDATE',
            entity: 'LeagueSettings',
            entityId: String(LEAGUE_SETTINGS_ID),
            details: { before, after: updated },
          }),
        });

        return updated;
      });
    }),
});
