import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getAuth } from "../auth";
import { loadEvent, requireDatabase } from "../db-helpers";
import type { Database } from "../db";
import { availability, participant } from "../db/schema";
import { publicProcedure, router } from "../trpc";
import type { EventRow } from "./event";

type ParticipantRow = typeof participant.$inferSelect;
type BusySlot = z.infer<typeof busySlot>;

const guestIdentity = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(50),
});

const busySlot = z.object({
  date: z.iso.date(),
  slotNumber: z.number().int().min(0),
});

const availabilityTarget = z.object({
  eventId: z.string().min(1),
  // Required only for guests; a session wins whenever one exists.
  guest: guestIdentity.optional(),
});

export const availabilitySaveInput = availabilityTarget.extend({
  busySlots: z
    .array(busySlot)
    // A generous cap; the real bound is the event's date range, checked below.
    .max(10_000)
    .refine(
      (slots) =>
        new Set(slots.map((slot) => `${slot.date}:${slot.slotNumber}`)).size ===
        slots.length,
      { message: "Duplicate busy slots" },
    ),
});

type Identity =
  | { kind: "guest"; guestId: string; name: string }
  | { kind: "user"; userId: string; name: string };

/**
 * A session account takes precedence; otherwise the browser-supplied guest
 * identity is used. This is the spec's model: guests are identified by the
 * identifier in their browser, accounts by the session.
 */
async function resolveIdentity(
  db: Database,
  headers: Headers,
  guest: z.infer<typeof guestIdentity> | undefined,
): Promise<Identity> {
  const session = await getAuth(db).api.getSession({ headers });
  if (session) {
    return { kind: "user", userId: session.user.id, name: session.user.name };
  }
  if (guest) {
    return { kind: "guest", guestId: guest.id, name: guest.name };
  }
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Sign in or join as a guest first",
  });
}

async function findParticipant(
  db: Database,
  eventId: string,
  identity: Identity,
): Promise<ParticipantRow | null> {
  const condition =
    identity.kind === "guest"
      ? and(eq(participant.eventId, eventId), eq(participant.guestId, identity.guestId))
      : and(eq(participant.eventId, eventId), eq(participant.userId, identity.userId));

  const [row] = await db.select().from(participant).where(condition);
  return row ?? null;
}

/**
 * Slot numbers count from the event's working hours start, so the valid
 * range comes from the event, not from the client.
 */
function assertSlotsFitEvent(eventRow: EventRow, slots: BusySlot[]): void {
  const slotsPerDay =
    (eventRow.workEndMinutes - eventRow.workStartMinutes) / eventRow.stepMinutes;

  for (const slot of slots) {
    if (slot.date < eventRow.startDate || slot.date > eventRow.endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Slot date ${slot.date} is outside the event dates`,
      });
    }
    if (slot.slotNumber >= slotsPerDay) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Slot ${slot.slotNumber} is outside the working hours`,
      });
    }
  }
}

export const availabilityRouter = router({
  // Null means "this identity has not saved a grid yet" — a normal state,
  // not an error.
  get: publicProcedure.input(availabilityTarget).query(async ({ ctx, input }) => {
    const db = requireDatabase(ctx);
    await loadEvent(db, input.eventId);

    const identity = await resolveIdentity(db, ctx.headers, input.guest);
    const existing = await findParticipant(db, input.eventId, identity);
    if (!existing) {
      return null;
    }

    const busySlots = await db
      .select({
        date: availability.date,
        slotNumber: availability.slotNumber,
      })
      .from(availability)
      .where(eq(availability.participantId, existing.id));

    return {
      name: existing.name,
      savedAt: existing.savedAt.toISOString(),
      busySlots,
    };
  }),

  save: publicProcedure
    .input(availabilitySaveInput)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx);
      const eventRow = await loadEvent(db, input.eventId);
      if (eventRow.status !== "open") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This event no longer accepts answers",
        });
      }

      const identity = await resolveIdentity(db, ctx.headers, input.guest);
      assertSlotsFitEvent(eventRow, input.busySlots);

      // The name is frozen on the first save: later saves keep the stored
      // one, whatever the client sends.
      const existing = await findParticipant(db, input.eventId, identity);
      const [saved] = existing
        ? await db
            .update(participant)
            .set({ savedAt: new Date() })
            .where(eq(participant.id, existing.id))
            .returning()
        : await db
            .insert(participant)
            .values({
              eventId: input.eventId,
              guestId: identity.kind === "guest" ? identity.guestId : null,
              userId: identity.kind === "user" ? identity.userId : null,
              name: identity.name,
            })
            .returning();

      // Replace the whole grid in one transaction. Neon's HTTP driver has no
      // interactive transactions, but batch runs the statements atomically.
      const removeOld = db
        .delete(availability)
        .where(eq(availability.participantId, saved.id));

      if (input.busySlots.length > 0) {
        await db.batch([
          removeOld,
          db.insert(availability).values(
            input.busySlots.map((slot) => ({
              participantId: saved.id,
              date: slot.date,
              slotNumber: slot.slotNumber,
            })),
          ),
        ]);
      } else {
        await removeOld;
      }

      return {
        name: saved.name,
        savedAt: saved.savedAt.toISOString(),
        busySlots: input.busySlots,
      };
    }),
});
