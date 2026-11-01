import { memo } from "react";
import { View } from "react-native";

import { Hatch } from "./Hatch";

type Props = {
  hatched: boolean;
  cellWidth: number;
  cellHeight: number;
};

/**
 * One availability cell. Memoized with primitive props only: while a drag
 * re-renders the whole grid, the untouched cells bail out right here.
 */
export const GridCell = memo(function GridCell({
  hatched,
  cellWidth,
  cellHeight,
}: Props) {
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
