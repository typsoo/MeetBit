import { Text, View } from "react-native";

import type { EventView } from "@/server/routers/event";

const STATUS: Record<
  EventView["status"],
  { label: string; chip: string; text: string }
> = {
  open: {
    label: "Open for answers",
    chip: "bg-mint-light",
    text: "text-mint-deep",
  },
  approved: {
    label: "Meeting scheduled",
    chip: "bg-blush-light",
    text: "text-blush-deep",
  },
};

export function EventHeader({ event }: { event: EventView }) {
  const status = STATUS[event.status];

  return (
    <View className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-display text-ink">{event.name}</Text>
        <View className={`rounded-pill px-3 py-1 ${status.chip}`}>
          <Text className={`text-caption font-semibold ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>
      {event.description ? (
        <Text className="text-body text-ink-muted">{event.description}</Text>
      ) : null}
    </View>
  );
}
