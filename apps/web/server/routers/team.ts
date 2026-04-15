import { TRPCError } from '@trpc/server';
import { UserRole } from '@nexus/db';
import type { PlayerRole } from '@nexus/db';
import type { TeamMarketValueEntry } from '@nexus/types';
import {
  teamCaptainCandidatesSchema,
  standingsInputSchema,
  teamCreateSchema,
  teamDeleteSchema,
  teamIdSchema,
  teamSlugSchema,
  teamUpdateSchema,
  teamUpdatePlayerRoleSchema,
} from '@/lib/validators/team';
import { buildAuditLogInput } from '@/server/utils/audit';
import { buildStandings } from '@/server/utils/standings';
import { ensureTeamAccess } from '@/server/utils/authz';
import {
  adminProcedure,
  captainProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';

const publicTeamSelect = {
  id: true,
  name: true,
  slug: true,
  shortCode: true,
  logoUrl: true,
  budget: true,
  captains: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  players: {
    orderBy: { role: 'asc' as const },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gameName: true,
      tagLine: true,
      imageUrl: true,
      role: true,
      teamRole: true,
      secondaryRoles: true,
      marketValue: true,
      salary: true,
      nationality: true,
      age: true,
      isActive: true,
    },
  },
} as const;

function toPublicTeam(team: {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string | null;
  budget: number;
  captains: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  players: Array<{
    id: string;
    firstName: string;
    lastName: string;
    gameName: string;
    tagLine: string;
    imageUrl: string | null;
    role: PlayerRole;
    teamRole: PlayerRole | null;
    secondaryRoles: PlayerRole[];
    marketValue: number;
    salary: number;
    nationality: string | null;
    age: number | null;
    isActive: boolean;
  }>;
}) {
  return {
    ...team,
    players: team.players.map((player) => ({
      ...player,
      displayName: resolveStoredPlayerDisplayName(player),
    })),
  };
}

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
        captains: {
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

  getCaptainCandidates: adminProcedure
    .input(teamCaptainCandidatesSchema)
    .query(({ ctx }) =>
      ctx.prisma.user.findMany({
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          captainOfTeamId: true,
          captainOfTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ),

  getById: publicProcedure.input(teamIdSchema).query(async ({ ctx, input }) => {
    const team = await ctx.prisma.team.findUnique({
      where: { id: input.id },
      select: publicTeamSelect,
    });

    if (!team) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    return toPublicTeam(team);
  }),

  getBySlug: publicProcedure.input(teamSlugSchema).query(async ({ ctx, input }) => {
    const team = await ctx.prisma.team.findUnique({
      where: { slug: input.slug },
      select: publicTeamSelect,
    });

    if (!team) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    return toPublicTeam(team);
  }),

  getStandings: publicProcedure
    .input(standingsInputSchema)
    .query(({ ctx, input }) =>
      buildStandings(
        ctx.prisma,
        input?.seasonId ? { seasonId: input.seasonId } : undefined,
      ),
    ),

  getMarketValueRanking: publicProcedure.query(async ({ ctx }): Promise<TeamMarketValueEntry[]> => {
    const teams = await ctx.prisma.team.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        logoUrl: true,
        players: {
          where: { isActive: true },
          select: {
            marketValue: true,
            salary: true,
          },
        },
      },
    });

    return teams
      .map((team) => {
        const totalMarketValue = team.players.reduce((sum, player) => sum + player.marketValue, 0);
        const totalSalary = team.players.reduce((sum, player) => sum + player.salary, 0);
        const playerCount = team.players.length;

        return {
          id: team.id,
          name: team.name,
          slug: team.slug,
          shortCode: team.shortCode,
          logoUrl: team.logoUrl,
          playerCount,
          totalMarketValue,
          averageMarketValue: playerCount > 0 ? Math.round(totalMarketValue / playerCount) : 0,
          totalSalary,
        };
      })
      .sort((left, right) => {
        const byMarketValue = right.totalMarketValue - left.totalMarketValue;
        if (byMarketValue !== 0) {
          return byMarketValue;
        }

        const byAverageValue = right.averageMarketValue - left.averageMarketValue;
        if (byAverageValue !== 0) {
          return byAverageValue;
        }

        return left.name.localeCompare(right.name);
      });
  }),

  create: adminProcedure.input(teamCreateSchema).mutation(async ({ ctx, input }) => {
    const created = await ctx.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: input.name,
          slug: input.slug,
          shortCode: input.shortCode,
          ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
          ...(input.budget !== undefined ? { budget: input.budget } : {}),
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

  update: adminProcedure.input(teamUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        budget: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
    }

    return ctx.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.slug ? { slug: data.slug } : {}),
          ...(data.shortCode ? { shortCode: data.shortCode } : {}),
          ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
          ...(data.budget !== undefined ? { budget: data.budget } : {}),
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
      await tx.user.updateMany({
        where: { captainOfTeamId: input.id, role: UserRole.TEAM_CAPTAIN },
        data: { role: UserRole.USER },
      });

      await tx.user.updateMany({
        where: { captainOfTeamId: input.id },
        data: { captainOfTeamId: null },
      });

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

  updatePlayerRole: captainProcedure
    .input(teamUpdatePlayerRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        select: { id: true, teamId: true, role: true, teamRole: true },
      });

      if (!player) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Joueur introuvable.' });
      }

      if (!player.teamId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Ce joueur n'appartient a aucune equipe.",
        });
      }

      ensureTeamAccess(ctx.session.user, player.teamId);

      return ctx.prisma.player.update({
        where: { id: input.playerId },
        data: { teamRole: input.teamRole },
        select: { id: true, gameName: true, role: true, teamRole: true },
      });
    }),
});
