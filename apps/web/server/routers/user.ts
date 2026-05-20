import { TRPCError } from '@trpc/server';
import { UserRole } from '@nexus/db';
import bcrypt from 'bcryptjs';
import {
  userAdminUpdateSchema,
  userAssignTeamSchema,
  userRegisterSchema,
  userRemoveTeamSchema,
  userUpdateProfileSchema,
  userUpdateRoleSchema,
} from '@/lib/validators/user';
import { isPublicRegistrationEnabled } from '@/lib/runtime-flags';
import { buildAuditLogInput } from '@/server/utils/audit';
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/trpc';

export const userRouter = createTRPCRouter({
  register: publicProcedure
    .input(userRegisterSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isPublicRegistrationEnabled) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Les inscriptions publiques sont fermées pour le moment.',
        });
      }

      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Un compte avec cet email existe deja.',
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: UserRole.USER,
        },
        select: { id: true, name: true, email: true },
      });

      return user;
    }),

  me: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        captainOfTeam: {
          select: { id: true, name: true, shortCode: true, logoUrl: true },
        },
      },
    }),
  ),

  updateProfile: protectedProcedure
    .input(userUpdateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const data: { name?: string; image?: string | null } = {};

      if (input.name !== undefined) {
        data.name = input.name;
      }

      if (input.image !== undefined) {
        data.image = input.image === '' ? null : input.image;
      }

      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data,
        select: { id: true, name: true, email: true, image: true, role: true },
      });
    }),

  adminUpdate: adminProcedure
    .input(userAdminUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, image: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
      }

      const data: { name?: string; image?: string | null } = {};

      if (input.name !== undefined) {
        data.name = input.name;
      }

      if (input.image !== undefined) {
        data.image = input.image === '' ? null : input.image;
      }

      if (Object.keys(data).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aucune mise a jour fournie.',
        });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          captainOfTeamId: true,
        },
      });

      await ctx.prisma.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE_PROFILE',
          entity: 'User',
          entityId: input.userId,
          details: {
            before: existing,
            after: { name: updated.name, image: updated.image },
          },
        }),
      });

      return updated;
    }),

  getAll: adminProcedure.query(({ ctx }) =>
    ctx.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        captainOfTeamId: true,
        captainOfTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        createdAt: true,
      },
    }),
  ),

  updateRole: adminProcedure
    .input(userUpdateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vous ne pouvez pas modifier votre propre role.',
        });
      }

      const existing = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
      }

      const role = input.role as UserRole;

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          role,
          ...(role === UserRole.USER ? { captainOfTeamId: null } : {}),
        },
        select: { id: true, name: true, email: true, role: true, captainOfTeamId: true },
      });

      await ctx.prisma.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE_ROLE',
          entity: 'User',
          entityId: input.userId,
          details: { previousRole: existing.role, newRole: updated.role },
        }),
      });

      return updated;
    }),

  assignTeam: adminProcedure
    .input(userAssignTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
      }

      const team = await ctx.prisma.team.findUnique({
        where: { id: input.teamId },
        select: { id: true, name: true },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipe introuvable.' });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          captainOfTeamId: input.teamId,
          ...(user.role === UserRole.USER ? { role: UserRole.TEAM_CAPTAIN } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          captainOfTeamId: true,
          captainOfTeam: { select: { id: true, name: true, shortCode: true } },
        },
      });

      await ctx.prisma.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'ASSIGN_TEAM',
          entity: 'User',
          entityId: input.userId,
          details: { teamId: input.teamId, teamName: team.name },
        }),
      });

      return updated;
    }),

  removeTeam: adminProcedure
    .input(userRemoveTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true, captainOfTeamId: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          captainOfTeamId: null,
          ...(user.role === UserRole.TEAM_CAPTAIN ? { role: UserRole.USER } : {}),
        },
        select: { id: true, name: true, email: true, role: true, captainOfTeamId: true },
      });

      await ctx.prisma.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'REMOVE_TEAM',
          entity: 'User',
          entityId: input.userId,
          details: { previousTeamId: user.captainOfTeamId },
        }),
      });

      return updated;
    }),
});
