import { z } from "zod";

export type EventStatus = "open" | "approved";

/**
 * Checks that the value is a known IANA timezone name. Node and browsers
 * expose the authoritative list through supportedValuesOf; engines without
 * it fall back to Intl.DateTimeFormat, which throws a RangeError for unknown
 * zones. If even DateTimeFormat is unavailable, validation degrades to
 * "accept and let the server decide" instead of crashing the module import.
 */
function isValidTimezone(name: string): boolean {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return new Set(Intl.supportedValuesOf("timeZone")).has(name);
    }
    new Intl.DateTimeFormat("en", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

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
      .refine(isValidTimezone, {
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
