import { TRPCError, initTRPC } from "@trpc/server";

import { getAuth } from "./auth";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.db) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const db = ctx.db;
  const session = await getAuth(db).api.getSession({
    headers: ctx.headers,
  });
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, db, session } });
});
