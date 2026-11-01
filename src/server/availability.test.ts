import { beforeEach, describe, expect, it, vi } from "vitest";

import { createContext } from "./context";
import type { Database } from "./db";
import { availability, event, participant } from "./db/schema";
import { availabilitySaveInput } from "./routers/availability";
import { appRouter } from "./routers/_app";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("./auth", () => ({
  getAuth: () => ({
    api: { getSession: mocks.getSession },
  }),
}));

const authSession = {
  session: { userId: "u1" },
  user: { id: "u1", name: "Dev User" },
};

const eventRow = {
  id: "event01",
  name: "RPG night",
  description: null,
  ownerUserId: "u1",
  timezone: "Europe/Warsaw",
  startDate: "2026-11-05",
  endDate: "2026-11-07",
  // 9:00–12:00 with a 60-minute step: three slots per day, numbered 0–2.
  workStartMinutes: 540,
  workEndMinutes: 720,
  stepMinutes: 60,
  status: "open",
  approvedDate: null,
  approvedSlot: null,
  createdAt: new Date("2026-10-30T12:00:00Z"),
};

const participantRow = {
  id: "p1",
  eventId: "event01",
  guestId: "guest12345",
  userId: null,
  name: "Mika",
  savedAt: new Date("2026-10-30T12:00:00Z"),
};

const saveInput = {
  eventId: "event01",
  guest: { id: "guest12345", name: "Mika" },
  busySlots: [
    { date: "2026-11-05", slotNumber: 0 },
    { date: "2026-11-05", slotNumber: 1 },
  ],
};

type Marker = { table: unknown; op: string; values: unknown };

/**
 * Records what the procedures ask the database to do instead of imitating
 * Postgres. Assertions then check the exact writes the procedures perform.
 */
function makeDb(options: {
  eventRow?: typeof eventRow | null;
  participantRows?: Array<typeof participantRow>;
  slotRows?: Array<{ date: string; slotNumber: number }>;
}) {
  const recorded = {
    participantInserts: [] as Array<Record<string, unknown>>,
    participantUpdates: [] as Array<Record<string, unknown>>,
    batches: [] as Array<Array<unknown>>,
    awaitedDeletes: 0,
    availabilityInserts: [] as Array<Array<Record<string, unknown>>>,
  };

  function insert(table: unknown) {
    return {
      values(values: unknown) {
        if (table === participant) {
          const row = values as Record<string, unknown>;
          recorded.participantInserts.push(row);
          return {
            returning: async () => [
              { ...row, id: "newP", savedAt: new Date("2026-10-31T10:00:00Z") },
            ],
          };
        }
        if (table === availability) {
          recorded.availabilityInserts.push(
            values as Array<Record<string, unknown>>,
          );
        }
        return { __marker: { table, op: "insert", values } } satisfies {
          __marker: Marker;
        };
      },
    };
  }

  function update(table: unknown) {
    return {
      set(values: unknown) {
        return {
          where: () => ({
            returning: async () => {
              if (table === participant) {
                recorded.participantUpdates.push(values as Record<string, unknown>);
              }
              return [{ ...participantRow, ...(values as object) }];
            },
          }),
        };
      },
    };
  }

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === event) {
            return options.eventRow === null ? [] : [options.eventRow ?? eventRow];
          }
          if (table === participant) {
            return options.participantRows ?? [];
          }
          if (table === availability) {
            return options.slotRows ?? [];
          }
          return [];
        },
      }),
    }),
    insert,
    update,
    delete: (table: unknown) => ({
      where: () => {
        const marker: Marker = { table, op: "delete", values: undefined };
        // Thenable when awaited directly, plain value when passed to batch().
        return Object.assign(marker, {
          then: (resolve: (value: unknown[]) => void) => {
            recorded.awaitedDeletes += 1;
            resolve([]);
          },
        });
      },
    }),
    batch: async (queries: Array<unknown>) => {
      recorded.batches.push(queries);
      return [];
    },
  };

  return { db: db as unknown as Database, recorded };
}

describe("availabilitySaveInput", () => {
  it("rejects duplicate busy slots", () => {
    const duplicated = {
      ...saveInput,
      busySlots: [
        { date: "2026-11-05", slotNumber: 0 },
        { date: "2026-11-05", slotNumber: 0 },
      ],
    };

    expect(availabilitySaveInput.safeParse(duplicated).success).toBe(false);
  });
});

describe("availability.save", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
  });

  it("creates a guest participant and saves the grid", async () => {
    const { db, recorded } = makeDb({ participantRows: [] });
    const caller = appRouter.createCaller(createContext({ db }));

    const saved = await caller.availability.save(saveInput);

    expect(saved).toMatchObject({
      name: "Mika",
      busySlots: saveInput.busySlots,
    });
    expect(recorded.participantInserts).toEqual([
      {
        eventId: "event01",
        guestId: "guest12345",
        userId: null,
        name: "Mika",
      },
    ]);
  });

  it("replaces the previous grid atomically with delete and insert", async () => {
    const { db, recorded } = makeDb({ participantRows: [participantRow] });
    const caller = appRouter.createCaller(createContext({ db }));

    await caller.availability.save(saveInput);

    // Both statements travel in one batch, i.e. one transaction.
    expect(recorded.batches).toHaveLength(1);
    expect(recorded.batches[0]).toHaveLength(2);
    expect(recorded.awaitedDeletes).toBe(0);
    expect(recorded.availabilityInserts).toEqual([
      [
        { participantId: "p1", date: "2026-11-05", slotNumber: 0 },
        { participantId: "p1", date: "2026-11-05", slotNumber: 1 },
      ],
    ]);
  });

  it("clears the grid when no busy slots are sent", async () => {
    const { db, recorded } = makeDb({ participantRows: [participantRow] });
    const caller = appRouter.createCaller(createContext({ db }));

    await caller.availability.save({ ...saveInput, busySlots: [] });

    expect(recorded.batches).toHaveLength(0);
    expect(recorded.awaitedDeletes).toBe(1);
    expect(recorded.availabilityInserts).toHaveLength(0);
  });

  it("keeps the stored name on later saves", async () => {
    const { db, recorded } = makeDb({ participantRows: [participantRow] });
    const caller = appRouter.createCaller(createContext({ db }));

    const saved = await caller.availability.save({
      ...saveInput,
      guest: { id: "guest12345", name: "Someone else" },
    });

    expect(saved.name).toBe("Mika");
    expect(recorded.participantInserts).toHaveLength(0);
    expect(recorded.participantUpdates).toHaveLength(1);
  });

  it("saves as an account participant when a session exists", async () => {
    mocks.getSession.mockResolvedValue(authSession);
    const { db, recorded } = makeDb({ participantRows: [] });
    const caller = appRouter.createCaller(createContext({ db }));

    await caller.availability.save({
      eventId: "event01",
      busySlots: saveInput.busySlots,
    });

    expect(recorded.participantInserts).toEqual([
      {
        eventId: "event01",
        guestId: null,
        userId: "u1",
        name: "Dev User",
      },
    ]);
  });

  it("rejects a request with neither a session nor a guest identity", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { db } = makeDb({ participantRows: [] });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(
      caller.availability.save({ eventId: "event01", busySlots: [] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects saving into an approved event", async () => {
    const { db } = makeDb({
      eventRow: { ...eventRow, status: "approved" },
      participantRows: [participantRow],
    });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(caller.availability.save(saveInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects slots outside the event dates", async () => {
    const { db } = makeDb({ participantRows: [participantRow] });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(
      caller.availability.save({
        ...saveInput,
        busySlots: [{ date: "2026-11-08", slotNumber: 0 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects slots outside the working hours", async () => {
    const { db } = makeDb({ participantRows: [participantRow] });
    const caller = appRouter.createCaller(createContext({ db }));

    // Three slots per day: 0, 1 and 2. Slot 3 does not exist.
    await expect(
      caller.availability.save({
        ...saveInput,
        busySlots: [{ date: "2026-11-05", slotNumber: 3 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an unknown event", async () => {
    const { db } = makeDb({ eventRow: null });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(caller.availability.save(saveInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("availability.get", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
  });

  it("returns null when the guest has not saved a grid yet", async () => {
    const { db } = makeDb({ participantRows: [] });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(
      caller.availability.get({
        eventId: "event01",
        guest: saveInput.guest,
      }),
    ).resolves.toBeNull();
  });

  it("returns the stored name and busy slots", async () => {
    const slotRows = [
      { date: "2026-11-05", slotNumber: 0 },
      { date: "2026-11-06", slotNumber: 2 },
    ];
    const { db } = makeDb({ participantRows: [participantRow], slotRows });
    const caller = appRouter.createCaller(createContext({ db }));

    await expect(
      caller.availability.get({
        eventId: "event01",
        guest: saveInput.guest,
      }),
    ).resolves.toEqual({
      name: "Mika",
      savedAt: participantRow.savedAt.toISOString(),
      busySlots: slotRows,
    });
  });
});
