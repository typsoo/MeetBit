import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDayHeader,
  formatMinutes,
  isoDaysBetween,
} from "./format";

describe("formatMinutes", () => {
  it("renders minutes from midnight as HH:MM", () => {
    expect(formatMinutes(540)).toBe("09:00");
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(18 * 60 + 30)).toBe("18:30");
  });
});

describe("formatDate", () => {
  it("keeps the date as written, without timezone shifts", () => {
    expect(formatDate("2026-11-05")).toBe("5 Nov 2026");
  });
});

describe("formatDayHeader", () => {
  it("adds the weekday", () => {
    // 2026-11-05 is a Thursday.
    expect(formatDayHeader("2026-11-05")).toBe("Thu 5 Nov");
  });
});

describe("isoDaysBetween", () => {
  it("returns every day of an inclusive range", () => {
    expect(isoDaysBetween("2026-11-05", "2026-11-07")).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });

  it("returns a single day for a one-day range", () => {
    expect(isoDaysBetween("2026-11-05", "2026-11-05")).toEqual(["2026-11-05"]);
  });

  it("crosses month boundaries", () => {
    expect(isoDaysBetween("2026-10-31", "2026-11-01")).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("crosses the spring DST change without skipping a day", () => {
    // Poland switches to summer time on 2026-03-29.
    expect(isoDaysBetween("2026-03-28", "2026-03-30")).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
  });
});
