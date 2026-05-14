import { createTRPCRouter } from '@/server/trpc';
import { adminRouter } from './admin';
import { articleRouter } from './article';
import { contractRouter } from './contract';
import { customRouter } from './custom';
import { leagueRouter } from './league';
import { matchRouter } from './match';
import { notificationRouter } from './notification';
import { playerRouter } from './player';
import { statsRouter } from './stats';
import { teamRouter } from './team';
import { transferRouter } from './transfer';
import { userRouter } from './user';

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  article: articleRouter,
  contract: contractRouter,
  custom: customRouter,
  league: leagueRouter,
  match: matchRouter,
  notification: notificationRouter,
  player: playerRouter,
  stats: statsRouter,
  team: teamRouter,
  transfer: transferRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
