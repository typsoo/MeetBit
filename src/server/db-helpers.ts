import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";
import type { Database } from "./db";
import { event } from "./db/schema";
import type { EventRow } from "./routers/event";

/** Procedures need the database; a context without one is a server mistake. */
export function requireDatabase(ctx: Context): Database {
  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database is not configured",
    });
  }
  return ctx.db;
}

export async function loadEvent(
  db: Database,
  eventId: string,
): Promise<EventRow> {
  const [row] = await db.select().from(event).where(eq(event.id, eventId));
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }
  return row;
}
