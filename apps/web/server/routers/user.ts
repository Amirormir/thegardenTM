import { userUpdateProfileSchema } from '@/lib/validators/user';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

export const userRouter = createTRPCRouter({
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
        captainedTeam: {
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
        // empty string → remove avatar
        data.image = input.image === '' ? null : input.image;
      }

      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data,
        select: { id: true, name: true, email: true, image: true, role: true },
      });
    }),
});
