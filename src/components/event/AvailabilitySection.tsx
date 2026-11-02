import { isoDaysBetween } from "@/lib/format";
import type { GuestIdentity } from "@/lib/guest";
import type { EventView } from "@/server/routers/event";

import type { Viewer } from "./model/viewer";
import { useAvailability } from "./hooks/useAvailability";
import { useHeatmap } from "./hooks/useHeatmap";
import { AvailabilityPanel } from "./ui/AvailabilityPanel";
import { GuestNameForm } from "./ui/GuestNameForm";
import { SavedNameNotice } from "./ui/SavedNameNotice";

type Props = {
  event: EventView;
  /** Member or guest: the anonymous and checking states never reach here. */
  viewer: Extract<Viewer, { kind: "member" | "guest" }>;
  onJoin: (name: string) => void;
};

/** Locked name once a grid was saved; otherwise the editable form. */
function GuestNameArea({
  guest,
  savedName,
  onJoin,
}: {
  guest: GuestIdentity;
  savedName: string | null;
  onJoin: (name: string) => void;
}) {
  if (savedName) {
    return <SavedNameNotice name={savedName} />;
  }
  return <GuestNameForm initialName={guest.name} onSubmit={onJoin} />;
}

/**
 * Mounted only when the identity is known: the availability query is not
 * conditionally enabled, it suspends and lets the boundary above show the
 * fallback.
 */
export function AvailabilitySection({ event, viewer, onJoin }: Props) {
  const availability = useAvailability({ eventId: event.id, viewer });
  // Same card as the grid: the cells color themselves with the aggregate.
  const heatmap = useHeatmap(event.id);

  const days = isoDaysBetween(event.startDate, event.endDate);
  const slotsPerDay =
    (event.workEndMinutes - event.workStartMinutes) / event.stepMinutes;

  return (
    <>
      {viewer.kind === "guest" && (
        <GuestNameArea
          guest={viewer.guest}
          savedName={availability.savedName}
          onJoin={onJoin}
        />
      )}
      <AvailabilityPanel
        event={event}
        days={days}
        slotsPerDay={slotsPerDay}
        availability={availability}
        heatmap={heatmap}
      />
    </>
  );
}
