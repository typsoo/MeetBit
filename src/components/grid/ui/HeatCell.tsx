import { memo } from "react";
import { Text, View } from "react-native";

import type { HeatLevel } from "../model/heat";
import { Hatch } from "./Hatch";

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

type Props = {
  level: HeatLevel;
  hatched: boolean;
  freeCount: number;
  totalCount: number;
  cellWidth: number;
  cellHeight: number;
};

/**
 * One results cell: the ramp step, the N/M label and the hatch over it.
 * Not wired into AvailabilityGrid yet — ticket 11 supplies the real counts,
 * at which point the input grid switches this cell in.
 */
export const HeatCell = memo(function HeatCell({
  level,
  hatched,
  freeCount,
  totalCount,
  cellWidth,
  cellHeight,
}: Props) {
  const classes = LEVEL_CLASSES[level];

  return (
    <View
      className={`relative items-center justify-center overflow-hidden border ${classes.bg} ${classes.text} ${classes.border}`}
      style={{ width: cellWidth }}
    >
      {/* The number hides under the hatch: there is no one left to count there. */}
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
