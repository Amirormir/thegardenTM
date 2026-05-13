import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { deleteSeasonTwoTestLeaderboardEntries } from '@/lib/custom/season-two';
import { saveSeasonTwoMatchReplay } from '@/lib/custom/season-two-match-detail';
import { parsedReplaySchema } from '@/lib/validators/replay';
import { adminProcedure, createTRPCRouter } from '@/server/trpc';

export const customRouter = createTRPCRouter({
  deleteTestLeaderboardEntries: adminProcedure.mutation(async () => {
    const result = await deleteSeasonTwoTestLeaderboardEntries();

    revalidatePath('/custom');
    revalidatePath('/custom/saison-2');

    return result;
  }),

  importMatchReplay: adminProcedure
    .input(
      z.object({
        matchId: z.string().min(1),
        blueTeam: z.enum(['team1', 'team2']),
        parsedReplay: parsedReplaySchema,
        playerMappings: z
          .array(
            z.object({
              side: z.enum(['BLUE', 'RED']),
              positionInTeam: z.number().int().min(0).max(4),
              userId: z.string().min(1),
            }),
          )
          .length(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await saveSeasonTwoMatchReplay(input, {
        id: ctx.session.user.id,
        name: ctx.session.user.name ?? null,
      });

      revalidatePath('/custom');
      revalidatePath('/custom/saison-2');
      revalidatePath(`/custom/saison-2/match/${input.matchId}`);

      return result;
    }),
});
