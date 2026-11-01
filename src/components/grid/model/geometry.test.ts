import { describe, expect, it } from "vitest";

import { MIN_CELL_WIDTH, TIME_COLUMN_WIDTH } from "./constants";
import { cellAt, cellMetrics, clamp, keyOf } from "./geometry";

describe("cellMetrics", () => {
  it("takes the time column out before splitting the width", () => {
    expect(cellMetrics(TIME_COLUMN_WIDTH + 7 * 200, 7).cellWidth).toBe(200);
  });

  it("never shrinks a cell below the minimum width", () => {
    expect(cellMetrics(300, 7).cellWidth).toBe(MIN_CELL_WIDTH);
  });

  it("returns whole sizes, so native cells do not drift apart", () => {
    const metrics = cellMetrics(TIME_COLUMN_WIDTH + 7 * 143, 7);

    expect(metrics.cellWidth).toBe(143);
    expect(Number.isInteger(metrics.cellWidth)).toBe(true);
    expect(Number.isInteger(metrics.cellHeight)).toBe(true);
  });

  it("derives the height from the cell width", () => {
    expect(cellMetrics(TIME_COLUMN_WIDTH + 7 * 150, 7).cellHeight).toBe(60);
  });
});

describe("cellAt", () => {
  const days = ["2026-11-05", "2026-11-06", "2026-11-07"];
  const metrics = { cellWidth: 100, cellHeight: 40 };

  it("maps a point to the day and slot under it", () => {
    expect(cellAt({ x: 250, y: 90 }, days, 26, metrics)).toEqual({
      date: "2026-11-07",
      slot: 2,
    });
  });

  it("treats a cell border as the next cell", () => {
    expect(cellAt({ x: 100, y: 40 }, days, 26, metrics)).toEqual({
      date: "2026-11-06",
      slot: 1,
    });
  });

  it("clamps a drag that leaves the grid", () => {
    expect(cellAt({ x: -50, y: -10 }, days, 26, metrics)).toEqual({
      date: "2026-11-05",
      slot: 0,
    });
    expect(cellAt({ x: 10_000, y: 10_000 }, days, 26, metrics)).toEqual({
      date: "2026-11-07",
      slot: 25,
    });
  });
});

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(-1, 0, 5)).toBe(0);
    expect(clamp(3, 0, 5)).toBe(3);
    expect(clamp(9, 0, 5)).toBe(5);
  });
});

describe("keyOf", () => {
  it("identifies a cell by date and slot", () => {
    expect(keyOf("2026-11-05", 3)).toBe("2026-11-05:3");
  });
});
