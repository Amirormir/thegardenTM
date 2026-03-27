import { createTRPCRouter } from '@/server/trpc';
import { adminRouter } from './admin';
import { contractRouter } from './contract';
import { leagueRouter } from './league';
import { matchRouter } from './match';
import { playerRouter } from './player';
import { statsRouter } from './stats';
import { teamRouter } from './team';

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  contract: contractRouter,
  league: leagueRouter,
  match: matchRouter,
  player: playerRouter,
  stats: statsRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
