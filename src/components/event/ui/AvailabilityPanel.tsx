import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AvailabilityGrid, type Cell } from "@/components/grid";
import { SlotInfoCard } from "@/components/SlotInfoCard";
import { formatClockTime, formatDayHeader, formatMinutes } from "@/lib/format";
import type { EventView } from "@/server/routers/event";

import type { AvailabilityState } from "../hooks/useAvailability";

type Props = {
  event: EventView;
  days: string[];
  slotsPerDay: number;
  availability: AvailabilityState;
};

/** The grid itself, the slot card and the save row. */
export function AvailabilityPanel({
  event,
  days,
  slotsPerDay,
  availability,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Cell | null>(null);
  const disabled = availability.isSaving || !availability.isDirty;

  return (
    <>
      <AvailabilityGrid
        days={days}
        slotsPerDay={slotsPerDay}
        workStartMinutes={event.workStartMinutes}
        stepMinutes={event.stepMinutes}
        busy={availability.busy}
        onChange={availability.setBusy}
        onSelectSlot={setSelectedSlot}
      />

      {selectedSlot ? (
        <SlotInfoCard
          title={`${formatDayHeader(selectedSlot.date)} · ${formatMinutes(
            event.workStartMinutes + selectedSlot.slot * event.stepMinutes,
          )}`}
          free={[]}
          busy={[]}
          onClose={() => setSelectedSlot(null)}
        />
      ) : null}

      <View className="gap-2 border-t border-line-soft pt-4">
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={availability.save}
          className={`items-center rounded-md bg-mint-deep px-4 py-3 ${
            disabled ? "opacity-60" : ""
          }`}
          style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
        >
          <Text className="text-body font-semibold text-paper">
            {availability.isSaving ? "Saving…" : "Save my availability"}
          </Text>
        </Pressable>

        {availability.error ? (
          <Text className="text-label text-danger">{availability.error}</Text>
        ) : null}
        {!availability.isDirty && availability.savedAt ? (
          <Text className="text-label text-ink-faint">
            Saved at {formatClockTime(availability.savedAt)}
          </Text>
        ) : null}
      </View>
    </>
  );
}
