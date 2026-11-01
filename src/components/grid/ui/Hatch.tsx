import { memo } from "react";
import { Line, Svg } from "react-native-svg";

import { HATCH_INK, HATCH_INK_LIGHT, HATCH_STEP } from "../model/constants";

type Props = {
  width: number;
  height: number;
  /** Light ink for the darkest ramp step, where dark lines would vanish. */
  light?: boolean;
};

/**
 * The "I am busy" texture, drawn over any shade. Explicit 45-degree lines
 * instead of an SVG pattern: they render identically on web and native, and
 * the cell clips whatever sticks out. Memoized: none of its props change
 * while the cell stays hatched, so drags elsewhere never rebuild the lines.
 */
export const Hatch = memo(function Hatch({
  width,
  height,
  light = false,
}: Props) {
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
        stroke={light ? HATCH_INK_LIGHT : HATCH_INK}
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
