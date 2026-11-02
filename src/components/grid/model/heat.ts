import type { Heatmap, SlotSummary } from "@/server/aggregate";

import type { Cell } from "./types";

/**
 * Ramp steps from palette.html: 0 is everyone busy, 4 is everyone free.
 * Kept next to the input grid so ticket 11 can switch it on without moving
 * the code again.
 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Share of free people among the confirmed ones: 0% is busy, 100% is its own
 * step, everything between splits into three bands.
 */
export function levelForShare(share: number): HeatLevel {
  if (share === 0) return 0;
  if (share <= 1 / 3) return 1;
  if (share <= 2 / 3) return 2;
  if (share < 1) return 3;
  return 4;
}

/** "date:slotNumber" → summary, so each cell looks its own row up in O(1). */
export type SlotIndex = Map<string, SlotSummary>;

export function slotIndex(heatmap: Heatmap): SlotIndex {
  const index = new Map<string, SlotSummary>();
  for (const slot of heatmap.slots) {
    index.set(`${slot.date}:${slot.slotNumber}`, slot);
  }
  return index;
}

export function slotAt(
  index: SlotIndex,
  cell: Cell,
): SlotSummary | null {
  return index.get(`${cell.date}:${cell.slot}`) ?? null;
}
