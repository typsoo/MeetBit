import { publicProcedure, router } from '../trpc';

import { eventRouter } from './event';

export const appRouter = router({
  system: router({
    status: publicProcedure.query(() => ({ status: 'ok' as const })),
  }),
  event: eventRouter,
});

export type AppRouter = typeof appRouter;
