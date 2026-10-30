import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createContext } from "./context";
import type { Database } from "./db";
import { eventCreateInput, type EventCreateInput } from "../lib/event-schema";
import { appRouter } from "./routers/_app";

// The procedure receives raw JSON over the wire, so the narrowed `30 | 60`
// literal type only exists after zod validation. Casting from the raw shape
// simulates a client sending values TypeScript would never allow locally.
type RawEventCreateInput = Omit<EventCreateInput, "stepMinutes"> & {
  stepMinutes: number;
};

function wireInput(input: RawEventCreateInput): EventCreateInput {
  return input as EventCreateInput;
}

// trpc.ts resolves the session through getAuth(ctx.db).api.getSession, which
// needs a real database. Mocking the auth module lets tests authenticate the
// caller without one.
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
  user: { id: "u1" },
};

const validInput: EventCreateInput = {
  name: "RPG night",
  description: "Board games and pizza",
  startDate: "2026-11-05",
  endDate: "2026-11-06",
  workStartMinutes: 540,
  workEndMinutes: 1080,
  stepMinutes: 30,
  timezone: "Europe/Warsaw",
};

describe("eventCreateInput", () => {
  it("accepts a valid input", () => {
    expect(eventCreateInput.parse(validInput)).toMatchObject(validInput);
  });

  it("rejects a blank name", () => {
    expect(eventCreateInput.safeParse({ ...validInput, name: "   " }).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const parsed = eventCreateInput.safeParse({
      ...validInput,
      endDate: "2026-11-04",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["endDate"]);
  });

  it("rejects an impossible calendar date", () => {
    expect(eventCreateInput.safeParse({ ...validInput, startDate: "2026-02-30" }).success).toBe(false);
  });

  it("rejects work hours that end before they start", () => {
    const parsed = eventCreateInput.safeParse({
      ...validInput,
      workStartMinutes: 1080,
      workEndMinutes: 540,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["workEndMinutes"]);
  });

  it("rejects work hours that do not divide evenly by the step", () => {
    // 9:00–17:30 is a 510-minute span: 30 minutes short of a whole 60-minute slot.
    const parsed = eventCreateInput.safeParse({
      ...validInput,
      workEndMinutes: 1050,
      stepMinutes: 60,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["workEndMinutes"]);
  });

  it("accepts a 60-minute step over a whole number of hours", () => {
    expect(
      eventCreateInput.safeParse({ ...validInput, stepMinutes: 60 }).success,
    ).toBe(true);
  });

  it("rejects a step other than 30 or 60 minutes", () => {
    expect(eventCreateInput.safeParse({ ...validInput, stepMinutes: 45 }).success).toBe(false);
  });

  it("rejects a timezone that is not an IANA name", () => {
    expect(eventCreateInput.safeParse({ ...validInput, timezone: "Mars/Olympus" }).success).toBe(false);
  });
});

describe("event.create", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
  });

  it("rejects an unauthenticated request", async () => {
    const caller = appRouter.createCaller(createContext({ db: null }));

    await expect(caller.event.create(validInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an invalid step at the procedure level", async () => {
    mocks.getSession.mockResolvedValue(authSession);
    const caller = appRouter.createCaller(createContext({ db: {} as Database }));

    await expect(
      caller.event.create(wireInput({ ...validInput, stepMinutes: 45 })),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("inserts an event owned by the session user and returns it", async () => {
    const row = {
      id: "ev1234567",
      name: "RPG night",
      description: "Board games and pizza",
      ownerUserId: "u1",
      timezone: "Europe/Warsaw",
      startDate: "2026-11-05",
      endDate: "2026-11-06",
      workStartMinutes: 540,
      workEndMinutes: 1080,
      stepMinutes: 30,
      status: "open",
      approvedDate: null,
      approvedSlot: null,
      createdAt: new Date("2026-10-30T12:00:00Z"),
    };
    const returning = vi.fn().mockResolvedValue([row]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert } as unknown as Database;

    mocks.getSession.mockResolvedValue(authSession);
    const caller = appRouter.createCaller(createContext({ db }));
    const created = await caller.event.create(validInput);

    expect(created).toEqual({
      id: "ev1234567",
      name: "RPG night",
      description: "Board games and pizza",
      timezone: "Europe/Warsaw",
      startDate: "2026-11-05",
      endDate: "2026-11-06",
      workStartMinutes: 540,
      workEndMinutes: 1080,
      stepMinutes: 30,
      status: "open",
    });
    expect(getTableName(insert.mock.calls[0]?.[0] as never)).toBe("event");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: "u1",
        stepMinutes: 30,
        id: expect.stringMatching(/^[\w-]{10}$/),
      }),
    );
  });
});

describe("event.getByShortId", () => {
  const row = {
    id: "ev1234567",
    name: "RPG night",
    description: null,
    ownerUserId: "u1",
    timezone: "Europe/Warsaw",
    startDate: "2026-11-05",
    endDate: "2026-11-06",
    workStartMinutes: 540,
    workEndMinutes: 1080,
    stepMinutes: 30,
    status: "open",
    approvedDate: null,
    approvedSlot: null,
    createdAt: new Date("2026-10-30T12:00:00Z"),
  };

  /** Select chain ending in an awaitable where() clause. */
  function fakeDb(rows: unknown[]): Database {
    return {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
    } as unknown as Database;
  }

  it("returns the event view for an existing short id", async () => {
    const caller = appRouter.createCaller(createContext({ db: fakeDb([row]) }));

    const found = await caller.event.getByShortId({ id: "ev1234567" });

    expect(found).toEqual({
      id: "ev1234567",
      name: "RPG night",
      description: null,
      timezone: "Europe/Warsaw",
      startDate: "2026-11-05",
      endDate: "2026-11-06",
      workStartMinutes: 540,
      workEndMinutes: 1080,
      stepMinutes: 30,
      status: "open",
    });
  });

  it("throws NOT_FOUND for an unknown short id", async () => {
    const caller = appRouter.createCaller(createContext({ db: fakeDb([]) }));

    await expect(
      caller.event.getByShortId({ id: "ev1234567" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
