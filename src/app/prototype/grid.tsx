import { memo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import { Line, Svg } from "react-native-svg";

import { SlotInfoCard } from "@/components/SlotInfoCard";

const ROWS = 26;
const MAX_COLUMNS = 7;
const MIN_CELL_WIDTH = 140;
const ROW_ASPECT = 2.5;
// The hatch texture from palette.html: a 1pt line with an 8pt perpendicular
// step, drawn at 45 degrees. Perpendicular step -> horizontal step of 8*sqrt2.
const HATCH_STEP = 8;

const MOCK_NAMES = ["Mika", "Ola", "Jan", "Zosia", "Piotr", "Ewa"];

// Pseudo-random but stable level per cell; the pattern is chosen so all five
// steps are visible within one screen.
const LEVEL_PATTERN: HeatLevel[] = [2, 0, 4, 1, 3, 2, 4];

function mockLevel(cell: Cell): HeatLevel {
  return LEVEL_PATTERN[(cell.row * 2 + cell.column) % LEVEL_PATTERN.length];
}

type Point = { x: number; y: number };
type Cell = { row: number; column: number };
type SlotInfo = { free: string[]; busy: string[] };
type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Deterministic mock: the same cell always shows the same people. The level
 * is picked first, and the lists are built to match it, so the whole ramp is
 * visible at once. People outside both lists are "not confirmed" — they do
 * not enter the denominator, which is exactly how the real ramp is defined.
 */
function mockSlotInfo(cell: Cell): SlotInfo {
  const level = mockLevel(cell);

  // Drop a person here and there so the denominator (M) varies.
  const confirmed = MOCK_NAMES.filter(
    (_, index) => (cell.row * 31 + cell.column * 17 + index) % 4 !== 0,
  );

  let freeCount: number;
  if (level === 0) {
    freeCount = 0;
  } else if (level === 4) {
    freeCount = confirmed.length;
  } else if (level === 1) {
    freeCount = Math.max(1, Math.floor(confirmed.length / 3));
  } else if (level === 2) {
    freeCount = Math.max(1, Math.round(confirmed.length / 2));
  } else {
    freeCount = confirmed.length - 1;
  }

  return {
    free: confirmed.slice(0, freeCount),
    busy: confirmed.slice(freeCount),
  };
}

/**
 * Share of free people among the confirmed ones (palette.html): 0% is busy,
 * 100% is its own step, everything between splits into three bands.
 */
function levelForShare(share: number): HeatLevel {
  if (share === 0) return 0;
  if (share <= 1 / 3) return 1;
  if (share <= 2 / 3) return 2;
  if (share < 1) return 3;
  return 4;
}

const LEVEL_CLASSES: Record<
  HeatLevel,
  { bg: string; text: string; border: string }
> = {
  0: { bg: "bg-busy", text: "text-busy-ink", border: "border-cell-line-busy" },
  1: { bg: "bg-free-1", text: "text-ink", border: "border-cell-line-1" },
  2: { bg: "bg-free-2", text: "text-ink", border: "border-cell-line-2" },
  3: { bg: "bg-free-3", text: "text-ink", border: "border-cell-line-3" },
  4: { bg: "bg-free-4", text: "text-paper", border: "border-cell-line-4" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// The full week is always rendered: cells grow when there is room and never
// shrink below MIN_CELL_WIDTH — tighter screens scroll sideways instead.
function cellMetrics(availableWidth: number) {
  const cellWidth = Math.max(MIN_CELL_WIDTH, availableWidth / MAX_COLUMNS);
  return { cellWidth, cellHeight: cellWidth / ROW_ASPECT };
}

function cellAt(point: Point, cellWidth: number, cellHeight: number): Cell {
  return {
    column: clamp(Math.floor(point.x / cellWidth), 0, MAX_COLUMNS - 1),
    row: clamp(Math.floor(point.y / cellHeight), 0, ROWS - 1),
  };
}

function keyOf(cell: Cell) {
  return `${cell.row}:${cell.column}`;
}

/**
 * The "I am busy" texture, drawn over any shade. Explicit 45-degree lines
 * instead of an SVG pattern: they render identically on web and native, and
 * the cell clips whatever sticks out. Memoized: none of its props change
 * while the cell stays hatched, so drags elsewhere never rebuild the lines.
 */
const Hatch = function Hatch({
  width,
  height,
  light,
}: {
  width: number;
  height: number;
  light: boolean;
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
        stroke={light ? "rgba(244, 251, 246, 0.7)" : "rgba(22, 38, 32, 0.45)"}
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
};

type GridCellProps = {
  level: HeatLevel;
  hatched: boolean;
  freeCount: number;
  totalCount: number;
  cellWidth: number;
  cellHeight: number;
};

/**
 * One availability cell. Memoized with primitive props only: while a drag
 * re-renders the whole grid, the ~180 untouched cells bail out right here.
 */
const GridCell = memo(function GridCell({
  level,
  hatched,
  freeCount,
  totalCount,
  cellWidth,
  cellHeight,
}: GridCellProps) {
  const classes = LEVEL_CLASSES[level];

  return (
    <View
      className={`relative flex-1 items-center justify-center overflow-hidden border ${classes.bg} ${classes.text} ${classes.border}`}
    >
      {/* The number hides under the hatch: there is no
          one left to count there. */}
      {!hatched ? (
        <Text className="text-num font-semibold">
          {freeCount}
          <Text className="text-num-sm opacity-75">/{totalCount}</Text>
        </Text>
      ) : null}
      {hatched && cellWidth > 0 ? (
        <Hatch width={cellWidth} height={cellHeight} light={level === 4} />
      ) : null}
    </View>
  );
});

export default function GridPrototypeScreen() {
  // The outer width, not the grid width: the grid is allowed to be wider
  // than its container (that is exactly when it scrolls sideways).
  const [width, setWidth] = useState<number | null>(null);
  const [painted, setPainted] = useState<Set<string>>(() => new Set());
  const [slotInfo, setSlotInfo] = useState<{
    cell: Cell;
    info: SlotInfo;
  } | null>(null);

  const modeRef = useRef<"paint" | "erase">("paint");
  const lastKeyRef = useRef<string | null>(null);
  const startCellRef = useRef<Cell | null>(null);

  function applyCell(cell: Cell) {
    const key = keyOf(cell);

    if (key === lastKeyRef.current) {
      return;
    }

    lastKeyRef.current = key;

    setPainted((prev) => {
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

  const pan = usePanGesture({
    disableReanimated: true,
    activateAfterLongPress: 250,
    onBegin: (event) => {
      if (width === null) return;

      const { cellWidth, cellHeight } = cellMetrics(width);
      const cell = cellAt(event, cellWidth, cellHeight);

      startCellRef.current = cell;
      modeRef.current = painted.has(keyOf(cell)) ? "erase" : "paint";
      lastKeyRef.current = null;
    },
    onActivate: () => {
      const cell = startCellRef.current;
      if (!cell) return;

      applyCell(cell);
    },
    onUpdate: (event) => {
      if (width === null) return;

      const { cellWidth, cellHeight } = cellMetrics(width);
      applyCell(cellAt(event, cellWidth, cellHeight));
    },
    onFinalize: () => {
      startCellRef.current = null;
      lastKeyRef.current = null;
    },
  });

  const doubleTap = useTapGesture({
    disableReanimated: true,
    numberOfTaps: 2,
    maxDelay: 200,
    maxDuration: 250,
    onActivate: (event) => {
      if (width === null) return;

      const { cellWidth, cellHeight } = cellMetrics(width);
      const cell = cellAt(event, cellWidth, cellHeight);
      setSlotInfo({ cell, info: mockSlotInfo(cell) });
    },
  });

  const gestures = useExclusiveGestures(pan, doubleTap);
  const metrics = width !== null ? cellMetrics(width) : null;

  return (
    <View className="flex-1 gap-4 px-6 pt-6">
      <View
        className="flex-1"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView contentContainerClassName="pb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <GestureDetector gesture={gestures}>
              <View
                className="overflow-hidden rounded-sm bg-surface"
                style={{
                  width: metrics ? MAX_COLUMNS * metrics.cellWidth : undefined,
                  height: metrics ? ROWS * metrics.cellHeight : 0,
                }}
              >
                {Array.from({ length: ROWS }, (_, row) => (
                  <View
                    key={row}
                    className="flex-row"
                    style={{ height: metrics?.cellHeight ?? 0 }}
                  >
                    {Array.from({ length: MAX_COLUMNS }, (_, column) => {
                      const cell = { row, column };
                      const info = mockSlotInfo(cell);
                      const freeCount = info.free.length;
                      const totalCount = freeCount + info.busy.length;

                      return (
                        <GridCell
                          key={column}
                          level={levelForShare(freeCount / totalCount)}
                          hatched={painted.has(keyOf(cell))}
                          freeCount={freeCount}
                          totalCount={totalCount}
                          cellWidth={metrics?.cellWidth ?? 0}
                          cellHeight={metrics?.cellHeight ?? 0}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </GestureDetector>
          </ScrollView>
        </ScrollView>
      </View>

      {slotInfo ? (
        <SlotInfoCard
          title={`Day ${slotInfo.cell.column + 1} · slot ${slotInfo.cell.row + 1}`}
          free={slotInfo.info.free}
          busy={slotInfo.info.busy}
          onClose={() => setSlotInfo(null)}
        />
      ) : null}
    </View>
  );
}
