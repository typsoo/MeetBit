import { Text, View } from "react-native";

import { formatDate, formatMinutes } from "@/lib/format";
import type { EventView } from "@/server/routers/event";

/** The event's fixed facts: when it runs and how the grid is cut. */
export function EventDetails({ event }: { event: EventView }) {
  const rows = [
    {
      label: "Dates",
      value: `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`,
    },
    {
      label: "Working hours",
      value: `${formatMinutes(event.workStartMinutes)} – ${formatMinutes(event.workEndMinutes)}`,
    },
    { label: "Grid step", value: `${event.stepMinutes} min` },
    { label: "Timezone", value: event.timezone },
  ];

  return (
    <View className="gap-2 border-t border-line-soft pt-4">
      {rows.map((row) => (
        <View key={row.label} className="flex-row justify-between gap-4">
          <Text className="text-label text-ink-muted">{row.label}</Text>
          <Text className="flex-shrink text-right text-label font-semibold text-ink">
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
