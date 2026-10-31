import { publicProcedure, router } from "../trpc";

import { availabilityRouter } from "./availability";
import { eventRouter } from "./event";

export const appRouter = router({
  system: router({
    status: publicProcedure.query(() => ({ status: "ok" as const })),
  }),
  event: eventRouter,
  availability: availabilityRouter,
});

export type AppRouter = typeof appRouter;
