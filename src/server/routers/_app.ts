import { publicProcedure, router } from '../trpc';

export const appRouter = router({
  system: router({
    status: publicProcedure.query(() => ({ status: 'ok' as const })),
  }),
});

export type AppRouter = typeof appRouter;
