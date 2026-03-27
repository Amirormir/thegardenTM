import { cache } from 'react';
import { createTRPCContext } from './context';
import { appRouter } from './routers/_app';

export const getServerCaller = cache(async () => appRouter.createCaller(await createTRPCContext()));
