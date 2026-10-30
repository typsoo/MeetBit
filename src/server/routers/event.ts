import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";

import { eventCreateInput, type EventStatus } from "../../lib/event-schema";
import { event } from "../db/schema";
import { publicProcedure, protectedProcedure, router } from "../trpc";

export type EventRow = typeof event.$inferSelect;

/**
 * The event shape exposed to clients. Deliberately narrower than the table
 * row: internal columns (owner user id) stay out of the API contract, so
 * adding columns later cannot break clients.
 */
export type EventView = {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  startDate: string;
  endDate: string;
  workStartMinutes: number;
  workEndMinutes: number;
  stepMinutes: number;
  status: EventStatus;
};

/**
 * The database CHECK constraint (`event_status_check`) guarantees only
 * 'open' and 'approved' are ever stored; this turns a violation into a loud
 * error instead of a silently wrong value.
 */
function toEventStatus(value: string): EventStatus {
  if (value !== "open" && value !== "approved") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Unknown event status: ${value}`,
    });
  }
  return value;
}

function toEventView(row: EventRow): EventView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    startDate: row.startDate,
    endDate: row.endDate,
    workStartMinutes: row.workStartMinutes,
    workEndMinutes: row.workEndMinutes,
    stepMinutes: row.stepMinutes,
    status: toEventStatus(row.status),
  };
}

export const eventRouter = router({
  create: protectedProcedure
    .input(eventCreateInput)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(event)
        .values({
          // Ten URL-safe characters make the short link hard to guess while
          // staying comfortably collision-free at this scale.
          id: nanoid(10),
          name: input.name,
          description: input.description || null,
          ownerUserId: ctx.session.user.id,
          timezone: input.timezone,
          startDate: input.startDate,
          endDate: input.endDate,
          workStartMinutes: input.workStartMinutes,
          workEndMinutes: input.workEndMinutes,
          stepMinutes: input.stepMinutes,
        })
        .returning();

      return toEventView(created);
    }),

  // Public on purpose: guests without an account must be able to open the
  // short link and see the event.
  getByShortId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database is not configured",
        });
      }

      const [row] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return toEventView(row);
    }),
});
