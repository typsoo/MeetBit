import { describe, expect, it } from "vitest";

import { buildHeatmap, type GridSubmission } from "./aggregate";
import { createContext } from "./context";
import type { Database } from "./db";
import { availability, event, participant } from "./db/schema";
import { appRouter } from "./routers/_app";

const days = ["2026-11-05", "2026-11-06"];
const slotsPerDay = 2;

function grid(
  participantId: string,
  name: string,
  busy: Array<[string, number]> = [],
): GridSubmission {
  return {
    participantId,
    name,
    busySlots: busy.map(([date, slotNumber]) => ({ date, slotNumber })),
  };
}

describe("buildHeatmap", () => {
  it("returns every slot with an empty denominator when nobody answered", () => {
    const heatmap = buildHeatmap({ days, slotsPerDay, grids: [] });

    expect(heatmap.M).toBe(0);
    expect(heatmap.slots).toHaveLength(days.length * slotsPerDay);
    expect(heatmap.slots[0]).toEqual({
      date: "2026-11-05",
      slotNumber: 0,
      free: [],
      busy: [],
      N: 0,
      K: 0,
      M: 0,
    });
  });

  it("counts one participant as busy on the marked slot and free elsewhere", () => {
    const heatmap = buildHeatmap({
      days,
      slotsPerDay,
      grids: [grid("p1", "Mika", [["2026-11-05", 1]])],
    });

    const marked = heatmap.slots.find(
      (slot) => slot.date === "2026-11-05" && slot.slotNumber === 1,
    );
    expect(marked).toMatchObject({ free: [], busy: ["Mika"], N: 0, K: 1, M: 1 });

    const other = heatmap.slots.find(
      (slot) => slot.date === "2026-11-05" && slot.slotNumber === 0,
    );
    expect(other).toMatchObject({ free: ["Mika"], busy: [], N: 1, K: 0, M: 1 });
  });

  it("keeps a participant who saved an empty grid in the results", () => {
    const heatmap = buildHeatmap({
      days,
      slotsPerDay,
      grids: [grid("p1", "Mika")],
    });

    expect(heatmap.M).toBe(1);
    expect(heatmap.slots.every((slot) => slot.N === 1 && slot.K === 0)).toBe(
      true,
    );
  });

  it("counts each participant once, even if their grid arrives twice", () => {
    const heatmap = buildHeatmap({
      days,
      slotsPerDay,
      grids: [
        grid("p1", "Mika", [["2026-11-05", 0]]),
        grid("p1", "Mika", [["2026-11-06", 0]]),
      ],
    });

    expect(heatmap.M).toBe(1);
    const first = heatmap.slots.find(
      (slot) => slot.date === "2026-11-05" && slot.slotNumber === 0,
    );
    const last = heatmap.slots.find(
      (slot) => slot.date === "2026-11-06" && slot.slotNumber === 0,
    );
    // Both marks survive the merge; the person still appears once per slot.
    expect(first).toMatchObject({ busy: ["Mika"], K: 1, N: 0 });
    expect(last).toMatchObject({ busy: ["Mika"], K: 1, N: 0 });
  });

  it("keeps participants with the same name apart", () => {
    const heatmap = buildHeatmap({
      days,
      slotsPerDay,
      grids: [
        grid("p1", "Anna", [["2026-11-05", 0]]),
        grid("p2", "Anna"),
      ],
    });

    expect(heatmap.M).toBe(2);
    const slot = heatmap.slots[0];
    expect(slot.N).toBe(1);
    expect(slot.K).toBe(1);
    expect(slot.free).toEqual(["Anna"]);
    expect(slot.busy).toEqual(["Anna"]);
  });

  it("walks days first, then slots", () => {
    const heatmap = buildHeatmap({ days, slotsPerDay, grids: [] });

    expect(heatmap.slots.map(({ date, slotNumber }) => `${date}:${slotNumber}`))
      .toEqual([
        "2026-11-05:0",
        "2026-11-05:1",
        "2026-11-06:0",
        "2026-11-06:1",
      ]);
  });
});

const eventRow = {
  id: "event01",
  name: "RPG night",
  description: null,
  ownerUserId: "u1",
  timezone: "Europe/Warsaw",
  startDate: "2026-11-05",
  endDate: "2026-11-06",
  workStartMinutes: 540,
  workEndMinutes: 660,
  stepMinutes: 60,
  status: "open",
  approvedDate: null,
  approvedSlot: null,
  createdAt: new Date("2026-10-30T12:00:00Z"),
};

/** Answers `select().from(table).where(...)` per table, like the real calls. */
function makeDb(options: {
  eventRow?: typeof eventRow | null;
  people?: Array<{ id: string; name: string }>;
  slots?: Array<{ participantId: string; date: string; slotNumber: number }>;
}) {
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === event) {
            return options.eventRow === null ? [] : [options.eventRow ?? eventRow];
          }
          if (table === participant) {
            return options.people ?? [];
          }
          if (table === availability) {
            return options.slots ?? [];
          }
          return [];
        },
      }),
    }),
  };

  return db as unknown as Database;
}

describe("aggregate.heatmap", () => {
  it("rejects an unknown event", async () => {
    const caller = appRouter.createCaller(
      createContext({ db: makeDb({ eventRow: null }) }),
    );

    await expect(caller.aggregate.heatmap({ eventId: "nope" })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
  });

  it("counts saved grids only and maps their busy slots", async () => {
    const caller = appRouter.createCaller(
      createContext({
        db: makeDb({
          people: [
            { id: "p1", name: "Mika" },
            { id: "p2", name: "Anna" },
          ],
          slots: [
            { participantId: "p1", date: "2026-11-05", slotNumber: 0 },
          ],
        }),
      }),
    );

    const heatmap = await caller.aggregate.heatmap({ eventId: "event01" });

    expect(heatmap.M).toBe(2);
    expect(heatmap.slots).toHaveLength(4);
    expect(heatmap.slots[0]).toMatchObject({
      date: "2026-11-05",
      slotNumber: 0,
      busy: ["Mika"],
      free: ["Anna"],
      N: 1,
      K: 1,
      M: 2,
    });
  });
});
