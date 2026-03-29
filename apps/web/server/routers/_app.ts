import { createTRPCRouter } from '@/server/trpc';
import { adminRouter } from './admin';
import { contractRouter } from './contract';
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
  contract: contractRouter,
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
