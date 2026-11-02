import { useState, type Dispatch, type SetStateAction } from "react";
import { ScrollView, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  useTapGesture,
} from "react-native-gesture-handler";

import type { Heatmap } from "@/server/aggregate";

import { useGridPan } from "./hooks/useGridPan";
import { MIN_CELL_WIDTH } from "./model/constants";
import { cellAt, cellMetrics } from "./model/geometry";
import { levelForShare, slotIndex } from "./model/heat";
import type { Cell } from "./model/types";
import { GridCell } from "./ui/GridCell";
import { GridHeader } from "./ui/GridHeader";
import { HeatCell } from "./ui/HeatCell";
import { TimeColumn } from "./ui/TimeColumn";

type Props = {
  /** ISO dates of the event range; one column per day. */
  days: string[];
  slotsPerDay: number;
  workStartMinutes: number;
  stepMinutes: number;
  /** Busy cells keyed "YYYY-MM-DD:slotNumber" (ADR-0004: empty means free). */
  busy: Set<string>;
  onChange: Dispatch<SetStateAction<Set<string>>>;
  /** Double tap on a slot; opens the details card. */
  onSelectSlot: (cell: Cell) => void;
  /** The aggregate: cells are ramp steps and the own mark hatches over. */
  heatmap: Heatmap;
};

/**
 * The input grid: days across, slots down, painting by drag. It owns nothing
 * but its measured width — the busy set belongs to the page, so the save
 * button sees exactly what is on screen.
 */
export function AvailabilityGrid({
  days,
  slotsPerDay,
  workStartMinutes,
  stepMinutes,
  busy,
  onChange,
  onSelectSlot,
  heatmap,
}: Props) {
  // The outer width, not the grid width: the grid is allowed to be wider
  // than its container — that is exactly when it scrolls sideways.
  const [width, setWidth] = useState<number | null>(null);

  function metricsNow() {
    return width === null ? null : cellMetrics(width, days.length);
  }

  const pan = useGridPan({
    days,
    slotsPerDay,
    metrics: metricsNow,
    busy,
    onChange,
  });

  const doubleTap = useTapGesture({
    disableReanimated: true,
    numberOfTaps: 2,
    maxDuration: 250,
    onActivate: (event) => {
      const size = metricsNow();
      if (!size || !onSelectSlot) return;

      onSelectSlot(cellAt(event, days, slotsPerDay, size));
    },
  });

  const gestures = useExclusiveGestures(pan, doubleTap);
  const metrics = metricsNow();
  const gridWidth = metrics ? days.length * metrics.cellWidth : 0;

  // React Compiler memoizes this; no useMemo by convention in this project.
  const summaryBySlot = slotIndex(heatmap);
  // Nobody answered yet: the grid keeps its plain input look.
  const heat = heatmap.M > 0 ? heatmap : null;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {/* Wide grids scroll sideways; the styled bar keeps that discoverable
          for a mouse, which has no swipe. */}
      <ScrollView horizontal className="grid-scroll">
        <View>
          <GridHeader
            days={days}
            cellWidth={metrics?.cellWidth ?? MIN_CELL_WIDTH}
          />

          <View className="flex-row">
            <TimeColumn
              slotsPerDay={slotsPerDay}
              workStartMinutes={workStartMinutes}
              stepMinutes={stepMinutes}
              cellHeight={metrics?.cellHeight ?? 0}
            />

            <GestureDetector gesture={gestures}>
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
                    {days.map((day) => {
                      const key = `${day}:${slot}`;
                      const hatched = busy.has(key);

                      if (!heat) {
                        return (
                          <GridCell
                            key={key}
                            hatched={hatched}
                            cellWidth={metrics?.cellWidth ?? 0}
                            cellHeight={metrics?.cellHeight ?? 0}
                          />
                        );
                      }

                      const summary = summaryBySlot.get(key);
                      return (
                        <HeatCell
                          key={key}
                          level={levelForShare((summary?.N ?? 0) / heat.M)}
                          // The participant's own mark sits on top of the
                          // ramp and hides the number beneath it.
                          hatched={hatched}
                          freeCount={summary?.N ?? 0}
                          totalCount={heat.M}
                          cellWidth={metrics?.cellWidth ?? 0}
                          cellHeight={metrics?.cellHeight ?? 0}
                        />
                      );
                    })}
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
