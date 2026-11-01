import { useLocalSearchParams } from "expo-router";

import { ClientOnly } from "@/components/ClientOnly";
import { EventScreen, ScreenMessage } from "@/components/event";

/** Shown on the server and during the first client render. */
function EventRouteSkeleton() {
  return <ScreenMessage title="Loading the event…" />;
}

export default function EventRoute() {
  const params = useLocalSearchParams<{ id?: string }>();

  return (
    <ClientOnly fallback={<EventRouteSkeleton />}>
      <EventScreen id={params.id ?? null} />
    </ClientOnly>
  );
}
