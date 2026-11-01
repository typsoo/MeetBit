/** One saved grid: the participant row exists, so the grid counts in `M`. */
export type GridSubmission = {
  participantId: string;
  name: string;
  busySlots: Array<{ date: string; slotNumber: number }>;
};

export type SlotSummary = {
  date: string;
  slotNumber: number;
  /** Names of participants free on this slot. */
  free: string[];
  /** Names of participants who marked this slot busy. */
  busy: string[];
  /** Free count. `N` in the UI. */
  N: number;
  /** Busy count. `K` in the UI. */
  K: number;
  /** Saved grids, the denominator of every slot. */
  M: number;
};

export type Heatmap = {
  /** Number of saved grids in the event. */
  M: number;
  days: string[];
  slotsPerDay: number;
  slots: SlotSummary[];
};

function slotKey(date: string, slotNumber: number) {
  return `${date}:${slotNumber}`;
}

/**
 * Free means "no busy row": a participant either marked the slot busy or is
 * free on it. `M` counts saved grids, not busy rows, so a participant who
 * saved an empty grid stays in the results and is free everywhere.
 *
 * Identity is the participant id, never the name: two participants may share
 * a name, and one participant must never appear twice.
 */
export function buildHeatmap(options: {
  days: string[];
  slotsPerDay: number;
  grids: GridSubmission[];
}): Heatmap {
  const { days, slotsPerDay, grids } = options;

  const names = new Map<string, string>();
  const busyByParticipant = new Map<string, Set<string>>();

  for (const grid of grids) {
    names.set(grid.participantId, grid.name);
    const busy = busyByParticipant.get(grid.participantId) ?? new Set<string>();
    for (const slot of grid.busySlots) {
      busy.add(slotKey(slot.date, slot.slotNumber));
    }
    busyByParticipant.set(grid.participantId, busy);
  }

  const participants = [...names.entries()];
  const slots: SlotSummary[] = [];

  for (const date of days) {
    for (let slotNumber = 0; slotNumber < slotsPerDay; slotNumber += 1) {
      const key = slotKey(date, slotNumber);
      const free: string[] = [];
      const busy: string[] = [];

      for (const [participantId, name] of participants) {
        const isBusy = busyByParticipant.get(participantId)?.has(key) ?? false;
        (isBusy ? busy : free).push(name);
      }

      slots.push({
        date,
        slotNumber,
        free,
        busy,
        N: free.length,
        K: busy.length,
        M: participants.length,
      });
    }
  }

  return { M: participants.length, days, slotsPerDay, slots };
}
