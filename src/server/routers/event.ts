import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";

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

export type EventStatus = "open" | "approved";

/**
 * The database CHECK constraint (`event_status_check`) guarantees this cast:
 * only 'open' and 'approved' can ever be stored.
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

/**
 * IANA timezone names supported by the runtime's ICU data. The database
 * cannot validate this (its tzdata drifts), so the API boundary is the
 * place where an unknown timezone is rejected.
 */
const timezones = new Set(Intl.supportedValuesOf("timeZone"));

export const eventCreateInput = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000).optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    workStartMinutes: z.number().int().min(0).max(24 * 60),
    workEndMinutes: z.number().int().min(0).max(24 * 60),
    stepMinutes: z.union([z.literal(30), z.literal(60)]),
    timezone: z
      .string()
      .refine((name) => timezones.has(name), {
        message: "Unknown IANA timezone",
      }),
  })
  // 'YYYY-MM-DD' strings order lexicographically the same way they order
  // chronologically, so plain string comparison is correct here.
  .refine((input) => input.endDate >= input.startDate, {
    message: "End date must not be before start date",
    path: ["endDate"],
  })
  .refine((input) => input.workEndMinutes > input.workStartMinutes, {
    message: "Work end must be after work start",
    path: ["workEndMinutes"],
  })
  // The grid is slotNumber * stepMinutes + workStartMinutes; a span that does
  // not divide evenly by the step would end in a partial slot.
  .refine(
    (input) => (input.workEndMinutes - input.workStartMinutes) % input.stepMinutes === 0,
    {
      message: "Working hours must divide evenly by the step",
      path: ["workEndMinutes"],
    },
  );

export type EventCreateInput = z.infer<typeof eventCreateInput>;

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
