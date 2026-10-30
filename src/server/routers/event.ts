import { nanoid } from "nanoid";
import { z } from "zod";

import { event } from "../db/schema";
import { protectedProcedure, router } from "../trpc";

export type EventRow = typeof event.$inferSelect;

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

      return created;
    }),
});
