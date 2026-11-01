import { useRef, type Dispatch, type SetStateAction } from "react";
import { usePanGesture } from "react-native-gesture-handler";

import { cellAt, keyOf } from "../model/geometry";
import type { Cell, Metrics } from "../model/types";

type Options = {
  /** ISO dates of the event range; one column per day. */
  days: string[];
  slotsPerDay: number;
  /** Null until the grid has been measured. */
  metrics: () => Metrics | null;
  busy: Set<string>;
  onChange: Dispatch<SetStateAction<Set<string>>>;
};

/**
 * The availability grid from the prototype (ticket 02): one pan gesture for
 * the whole container, the container is the coordinate system, and the first
 * cell decides whether the drag paints or erases. Callbacks fire many times
 * per drag, so the mode and the last cell live in refs.
 *
 * Holding is what starts the stroke: a finger that moves before the long
 * press expires leaves the gesture unactivated, and the page scrolls instead.
 */
export function useGridPan({
  days,
  slotsPerDay,
  metrics,
  busy,
  onChange,
}: Options) {
  const modeRef = useRef<"paint" | "erase">("paint");
  const lastKeyRef = useRef<string | null>(null);
  const startCellRef = useRef<Cell | null>(null);

  function applyCell(cell: Cell) {
    const key = keyOf(cell.date, cell.slot);

    if (key === lastKeyRef.current) {
      return;
    }

    lastKeyRef.current = key;

    onChange((prev) => {
      const shouldPaint = modeRef.current === "paint";

      if (prev.has(key) === shouldPaint) {
        return prev;
      }

      const next = new Set(prev);
      if (shouldPaint) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  return usePanGesture({
    disableReanimated: true,
    activateAfterLongPress: 250,
    onBegin: (event) => {
      const size = metrics();
      if (!size) return;

      const cell = cellAt(event, days, slotsPerDay, size);

      startCellRef.current = cell;
      // The first cell decides whether this drag paints or erases.
      modeRef.current = busy.has(keyOf(cell.date, cell.slot))
        ? "erase"
        : "paint";
      lastKeyRef.current = null;
    },
    onActivate: () => {
      const cell = startCellRef.current;
      if (!cell) return;

      applyCell(cell);
    },
    onUpdate: (event) => {
      const size = metrics();
      if (!size) return;

      applyCell(cellAt(event, days, slotsPerDay, size));
    },
    onFinalize: () => {
      startCellRef.current = null;
      lastKeyRef.current = null;
    },
  });
}
