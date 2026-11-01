import { memo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { Line, Svg } from "react-native-svg";

import { formatDayHeader, formatMinutes } from "@/lib/format";

// Cells grow when there is room and never shrink below MIN_CELL_WIDTH —
// tighter screens scroll sideways instead. Integer sizes on purpose: Yoga
// rounds every node to the physical pixel grid on native, and fractional
// cells end up a pixel apart from their neighbours. Web renders subpixels
// smoothly and hides the problem.
const MIN_CELL_WIDTH = 140;
const ROW_ASPECT = 2.5;
const TIME_COLUMN_WIDTH = 56;
// The hatch texture from palette.html: a 1pt line with an 8pt perpendicular
// step, drawn at 45 degrees.
const HATCH_STEP = 8;
const HATCH_INK = "rgba(22, 38, 32, 0.45)";

type Cell = { date: string; slot: number };

function keyOf(date: string, slot: number) {
  return `${date}:${slot}`;
}

type Props = {
  /** ISO dates of the event range; one column per day. */
  days: string[];
  slotsPerDay: number;
  workStartMinutes: number;
  stepMinutes: number;
  /** Busy cells keyed "YYYY-MM-DD:slotNumber" (ADR-0004: empty means free). */
  busy: Set<string>;
  onChange: (next: Set<string>) => void;
};

function cellMetrics(availableWidth: number, dayCount: number) {
  const cellWidth = Math.max(
    MIN_CELL_WIDTH,
    Math.floor((availableWidth - TIME_COLUMN_WIDTH) / dayCount),
  );
  const cellHeight = Math.round(cellWidth / ROW_ASPECT);
  return { cellWidth, cellHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The "I am busy" texture, drawn over any shade. Explicit 45-degree lines
 * instead of an SVG pattern: they render identically on web and native, and
 * the cell clips whatever sticks out. Memoized: none of its props change
 * while the cell stays busy, so drags elsewhere never rebuild the lines.
 */
const Hatch = memo(function Hatch({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const step = HATCH_STEP * Math.SQRT2;
  const lines = [];
  for (let x = -height; x <= width; x += step) {
    lines.push(
      <Line
        key={x}
        x1={x}
        y1={0}
        x2={x + height}
        y2={height}
        stroke={HATCH_INK}
        strokeWidth={1}
      />,
    );
  }

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0 }}
      pointerEvents="none"
    >
      {lines}
    </Svg>
  );
});

/**
 * One availability cell. Memoized with primitive props only: while a drag
 * re-renders the whole grid, the untouched cells bail out right here.
 */
const GridCell = memo(function GridCell({
  hatched,
  cellWidth,
  cellHeight,
}: {
  hatched: boolean;
  cellWidth: number;
  cellHeight: number;
}) {
  return (
    <View
      className="relative items-center justify-center overflow-hidden border border-line-soft bg-surface"
      style={{ width: cellWidth }}
    >
      {hatched && cellWidth > 0 ? (
        <Hatch width={cellWidth} height={cellHeight} />
      ) : null}
    </View>
  );
});

/**
 * The availability grid from the prototype (ticket 02): the container is
 * measured with onLayout, cells derive their size from it, and one pan
 * gesture drives painting — holding starts the stroke, the first cell decides
 * whether the drag paints or erases, and every crossed cell follows.
 */
export function AvailabilityGrid({
  days,
  slotsPerDay,
  workStartMinutes,
  stepMinutes,
  busy,
  onChange,
}: Props) {
  // The outer width, not the grid width: the grid is allowed to be wider
  // than its container — that is exactly when it scrolls sideways.
  const [width, setWidth] = useState<number | null>(null);

  // Gesture callbacks fire many times per drag; refs keep them from reading
  // a stale state between renders.
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const modeRef = useRef<"paint" | "erase">("paint");
  const lastKeyRef = useRef<string | null>(null);
  const startCellRef = useRef<Cell | null>(null);

  function metricsNow() {
    return width === null ? null : cellMetrics(width, days.length);
  }

  function applyCell(cell: Cell) {
    const key = keyOf(cell.date, cell.slot);

    if (key === lastKeyRef.current) {
      return;
    }

    lastKeyRef.current = key;

    const shouldPaint = modeRef.current === "paint";
    const current = busyRef.current;
    if (current.has(key) === shouldPaint) {
      return;
    }

    const next = new Set(current);
    if (shouldPaint) {
      next.add(key);
    } else {
      next.delete(key);
    }
    // Keep the ref in step so the rest of this drag sees the new set.
    busyRef.current = next;
    onChangeRef.current(next);
  }

  function cellAt(
    point: { x: number; y: number },
    cellWidth: number,
    cellHeight: number,
  ): Cell {
    return {
      date: days[clamp(Math.floor(point.x / cellWidth), 0, days.length - 1)],
      slot: clamp(Math.floor(point.y / cellHeight), 0, slotsPerDay - 1),
    };
  }

  const pan = usePanGesture({
    disableReanimated: true,
    activateAfterLongPress: 250,
    onBegin: (event) => {
      const metrics = metricsNow();
      if (!metrics) return;

      const cell = cellAt(event, metrics.cellWidth, metrics.cellHeight);

      startCellRef.current = cell;
      // The first cell decides whether this drag paints or erases.
      modeRef.current = busyRef.current.has(keyOf(cell.date, cell.slot))
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
      const metrics = metricsNow();
      if (!metrics) return;

      applyCell(cellAt(event, metrics.cellWidth, metrics.cellHeight));
    },
    onFinalize: () => {
      startCellRef.current = null;
      lastKeyRef.current = null;
    },
  });

  const metrics = width === null ? null : cellMetrics(width, days.length);
  const gridWidth = metrics ? days.length * metrics.cellWidth : 0;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row">
            <View style={{ width: TIME_COLUMN_WIDTH }} />
            {days.map((day) => (
              <View
                key={day}
                className="items-center py-1.5"
                style={{ width: metrics?.cellWidth ?? MIN_CELL_WIDTH }}
              >
                <Text className="text-caption font-semibold uppercase tracking-widest text-ink-muted">
                  {formatDayHeader(day)}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row">
            <View>
              {Array.from({ length: slotsPerDay }, (_, slot) => (
                <View
                  key={slot}
                  className="justify-center pr-1.5"
                  style={{
                    width: TIME_COLUMN_WIDTH,
                    height: metrics?.cellHeight ?? 0,
                  }}
                >
                  <Text className="text-caption text-ink-faint tabular-nums text-right">
                    {formatMinutes(workStartMinutes + slot * stepMinutes)}
                  </Text>
                </View>
              ))}
            </View>

            <GestureDetector gesture={pan}>
              <View
                className="overflow-hidden rounded-sm border border-line bg-surface"
                style={{
                  width: gridWidth,
                  height: metrics ? slotsPerDay * metrics.cellHeight : 0,
                }}
              >
                {Array.from({ length: slotsPerDay }, (_, slot) => (
                  <View
                    key={slot}
                    className="flex-row"
                    style={{ height: metrics?.cellHeight ?? 0 }}
                  >
                    {days.map((day) => (
                      <GridCell
                        key={keyOf(day, slot)}
                        hatched={busy.has(keyOf(day, slot))}
                        cellWidth={metrics?.cellWidth ?? 0}
                        cellHeight={metrics?.cellHeight ?? 0}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </GestureDetector>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
