import { Text, View } from "react-native";

import { formatMinutes } from "@/lib/format";

import { TIME_COLUMN_WIDTH } from "../model/constants";

type Props = {
  slotsPerDay: number;
  workStartMinutes: number;
  stepMinutes: number;
  cellHeight: number;
};

/** Start time of every row, aligned with the grid rows. */
export function TimeColumn({
  slotsPerDay,
  workStartMinutes,
  stepMinutes,
  cellHeight,
}: Props) {
  return (
    <View>
      {Array.from({ length: slotsPerDay }, (_, slot) => (
        <View
          key={slot}
          className="justify-center pr-1.5"
          style={{ width: TIME_COLUMN_WIDTH, height: cellHeight }}
        >
          <Text className="text-caption text-ink-faint tabular-nums text-right">
            {formatMinutes(workStartMinutes + slot * stepMinutes)}
          </Text>
        </View>
      ))}
    </View>
  );
}
