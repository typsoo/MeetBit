import { keyOf } from "@/components/grid/model";

/** Shape the API accepts and returns for a saved grid. */
export type BusySlot = { date: string; slotNumber: number };

export function slotsToBusy(slots: BusySlot[]): Set<string> {
  return new Set(slots.map((slot) => keyOf(slot.date, slot.slotNumber)));
}

export function busyToSlots(busy: Set<string>): BusySlot[] {
  return Array.from(busy, (key) => {
    const [date, slot] = key.split(":");
    return { date, slotNumber: Number(slot) };
  });
}

/** Order-independent comparison, for "has the grid changed since saving". */
export function sameBusy(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const key of a) {
    if (!b.has(key)) {
      return false;
    }
  }
  return true;
}
