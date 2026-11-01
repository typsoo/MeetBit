import { Suspense } from "react";
import { Text } from "react-native";

import type { EventView } from "@/server/routers/event";

import type { Viewer } from "../model/viewer";
import { AvailabilitySection } from "../AvailabilitySection";
import { GuestNameForm } from "./GuestNameForm";

type Props = {
  event: EventView;
  viewer: Viewer;
  onJoin: (name: string) => void;
};

/**
 * The answering card body. The availability query needs a known identity,
 * so nothing mounts until one exists: while checking there is nothing to
 * show, while anonymous the guest form is the only sensible content.
 */
/** Shown while the availability query suspends. */
function AvailabilitySectionSkeleton() {
  return (
    <Text className="text-label text-ink-faint">Loading your grid…</Text>
  );
}

export function AnsweringArea({ event, viewer, onJoin }: Props) {
  if (viewer.kind === "checking") {
    return null;
  }

  if (viewer.kind === "anonymous") {
    return <GuestNameForm onSubmit={onJoin} />;
  }

  return (
    <Suspense fallback={<AvailabilitySectionSkeleton />}>
      <AvailabilitySection event={event} viewer={viewer} onJoin={onJoin} />
    </Suspense>
  );
}
