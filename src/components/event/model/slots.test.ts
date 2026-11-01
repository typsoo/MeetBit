import { describe, expect, it } from "vitest";

import { busyToSlots, sameBusy, slotsToBusy } from "./slots";

describe("slotsToBusy", () => {
  it("keys slots the same way the grid does", () => {
    expect(
      slotsToBusy([
        { date: "2026-11-05", slotNumber: 0 },
        { date: "2026-11-06", slotNumber: 7 },
      ]),
    ).toEqual(new Set(["2026-11-05:0", "2026-11-06:7"]));
  });

  it("returns an empty set for a participant with no busy slots", () => {
    expect(slotsToBusy([]).size).toBe(0);
  });
});

describe("busyToSlots", () => {
  it("turns cell keys back into API slots", () => {
    expect(busyToSlots(new Set(["2026-11-05:0", "2026-11-06:7"]))).toEqual([
      { date: "2026-11-05", slotNumber: 0 },
      { date: "2026-11-06", slotNumber: 7 },
    ]);
  });

  it("round-trips without losing cells", () => {
    const busy = new Set(["2026-11-05:3", "2026-11-07:12"]);

    expect(slotsToBusy(busyToSlots(busy))).toEqual(busy);
  });
});

describe("sameBusy", () => {
  it("ignores the order cells were marked in", () => {
    expect(
      sameBusy(
        new Set(["2026-11-05:0", "2026-11-06:1"]),
        new Set(["2026-11-06:1", "2026-11-05:0"]),
      ),
    ).toBe(true);
  });

  it("detects an added or removed cell", () => {
    expect(sameBusy(new Set(["a:1"]), new Set(["a:1", "a:2"]))).toBe(false);
    expect(sameBusy(new Set(["a:1", "a:2"]), new Set(["a:1"]))).toBe(false);
    expect(sameBusy(new Set(["a:1"]), new Set(["a:2"]))).toBe(false);
  });
});
