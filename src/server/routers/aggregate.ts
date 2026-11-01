import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { isoDaysBetween } from "@/lib/format";

import { buildHeatmap, type GridSubmission } from "../aggregate";
import { loadEvent, requireDatabase } from "../db-helpers";
import { availability, participant } from "../db/schema";
import { publicProcedure, router } from "../trpc";

export const aggregateRouter = router({
  // Read-only and identity-free: the whole point of results is to see what
  // everyone answered. Unknown event is NOT_FOUND, same as elsewhere.
  heatmap: publicProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx);
      const eventRow = await loadEvent(db, input.eventId);

      const days = isoDaysBetween(eventRow.startDate, eventRow.endDate);
      const slotsPerDay =
        (eventRow.workEndMinutes - eventRow.workStartMinutes) /
        eventRow.stepMinutes;

      // Two flat selects instead of a join: participants give `M`, busy rows
      // give the marks. A participant without busy rows is free everywhere.
      const people = await db
        .select({ id: participant.id, name: participant.name })
        .from(participant)
        .where(eq(participant.eventId, input.eventId));

      const slots = people.length
        ? await db
            .select({
              participantId: availability.participantId,
              date: availability.date,
              slotNumber: availability.slotNumber,
            })
            .from(availability)
            .where(
              inArray(
                availability.participantId,
                people.map((person) => person.id),
              ),
            )
        : [];

      const grids: GridSubmission[] = people.map((person) => ({
        participantId: person.id,
        name: person.name,
        busySlots: slots
          .filter((slot) => slot.participantId === person.id)
          .map((slot) => ({ date: slot.date, slotNumber: slot.slotNumber })),
      }));

      return buildHeatmap({ days, slotsPerDay, grids });
    }),
});
