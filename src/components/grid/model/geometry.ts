import { MIN_CELL_WIDTH, ROW_ASPECT, TIME_COLUMN_WIDTH } from "./constants";
import type { Cell, Metrics, Point } from "./types";

/** A busy cell is identified by data, not pixels, so it survives resizes. */
export function keyOf(date: string, slot: number) {
  return `${date}:${slot}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Integer sizes on purpose: Yoga rounds every node to the physical pixel grid
 * on native, and fractional cells end up a pixel apart from their neighbours.
 * The time column is taken out of the measured width before the split.
 */
export function cellMetrics(availableWidth: number, dayCount: number): Metrics {
  const cellWidth = Math.max(
    MIN_CELL_WIDTH,
    Math.floor((availableWidth - TIME_COLUMN_WIDTH) / dayCount),
  );
  return { cellWidth, cellHeight: Math.round(cellWidth / ROW_ASPECT) };
}

/**
 * The same function serves drawing and hit testing, so the cell that is
 * painted is always the cell under the pointer. Points outside the grid clamp
 * to its edges instead of producing an empty cell.
 */
export function cellAt(
  point: Point,
  days: string[],
  slotsPerDay: number,
  { cellWidth, cellHeight }: Metrics,
): Cell {
  return {
    date: days[clamp(Math.floor(point.x / cellWidth), 0, days.length - 1)],
    slot: clamp(Math.floor(point.y / cellHeight), 0, slotsPerDay - 1),
  };
}
