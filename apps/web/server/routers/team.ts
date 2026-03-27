import { TRPCError } from '@trpc/server';
import {
  standingsInputSchema,
  teamCreateSchema,
  teamDeleteSchema,
  teamIdSchema,
  teamUpdateSchema,
} from '@/lib/validators/team';
import { buildAuditLogInput } from '@/server/utils/audit';
import { ensureTeamAccess } from '@/server/utils/authz';
import { buildStandings } from '@/server/utils/standings';
import {
  adminProcedure,
  captainProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';

export const teamRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) =>
    ctx.prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        logoUrl: true,
        budget: true,
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            players: true,
          },
        },
      },
    }),
  ),

  getById: publicProcedure.input(teamIdSchema).query(async ({ ctx, input }) => {
    const team = await ctx.prisma.team.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        logoUrl: true,
        budget: true,
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        players: {
          orderBy: { role: 'asc' },
          select: {
            id: true,
            gameName: true,
            tagLine: true,
            role: true,
            marketValue: true,
            salary: true,
          },
        },
      },
    });

    if (!team) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    return team;
  }),

  getStandings: publicProcedure
    .input(standingsInputSchema)
    .query(({ ctx, input }) =>
      buildStandings(
        ctx.prisma,
        input?.seasonId ? { seasonId: input.seasonId } : undefined,
      ),
    ),

  create: adminProcedure.input(teamCreateSchema).mutation(async ({ ctx, input }) => {
    const created = await ctx.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: input.name,
          slug: input.slug,
          shortCode: input.shortCode,
          ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
          ...(input.budget !== undefined ? { budget: input.budget } : {}),
          ...(input.captainId ? { captainId: input.captainId } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          shortCode: true,
          budget: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Team',
          entityId: team.id,
          details: {
            name: team.name,
            shortCode: team.shortCode,
          },
        }),
      });

      return team;
    });

    return created;
  }),

  update: captainProcedure.input(teamUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        budget: true,
        captainId: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    ensureTeamAccess(ctx.session.user, id);

    return ctx.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.slug ? { slug: data.slug } : {}),
          ...(data.shortCode ? { shortCode: data.shortCode } : {}),
          ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
          ...(data.budget !== undefined ? { budget: data.budget } : {}),
          ...(ctx.session.user.role === 'ADMIN' && data.captainId
            ? { captainId: data.captainId }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          shortCode: true,
          budget: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Team',
          entityId: id,
          details: {
            before: existing,
            after: team,
          },
        }),
      });

      return team;
    });
  }),

  delete: adminProcedure.input(teamDeleteSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.team.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    await ctx.prisma.$transaction(async (tx) => {
      await tx.team.delete({ where: { id: input.id } });
      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'DELETE',
          entity: 'Team',
          entityId: input.id,
          details: {
            name: existing.name,
          },
        }),
      });
    });

    return { success: true };
  }),
});
