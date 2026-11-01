import { Text, View } from "react-native";

import { formatDayHeader } from "@/lib/format";

import { TIME_COLUMN_WIDTH } from "../model/constants";

type Props = {
  /** ISO dates of the event range; one column per day. */
  days: string[];
  cellWidth: number;
};

/** Day labels above the grid, aligned with the columns. */
export function GridHeader({ days, cellWidth }: Props) {
  return (
    <View className="flex-row">
      <View style={{ width: TIME_COLUMN_WIDTH }} />
      {days.map((day) => (
        <View
          key={day}
          className="items-center py-1.5"
          style={{ width: cellWidth }}
        >
          <Text className="text-caption font-semibold uppercase tracking-widest text-ink-muted">
            {formatDayHeader(day)}
          </Text>
        </View>
      ))}
    </View>
  );
}
