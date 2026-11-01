import { useState } from "react";
import { ScrollView, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { loadGuest, saveGuest, type GuestIdentity } from "@/lib/guest";

import { AvailabilitySection } from "./AvailabilitySection";
import { resolveViewer } from "./model/viewer";
import { useEvent } from "./hooks/useEvent";
import { AnsweringArea } from "./ui/AnsweringArea";
import { AvailabilityCard } from "./ui/AvailabilityCard";
import { EventDetails } from "./ui/EventDetails";
import { EventHeader } from "./ui/EventHeader";

export function EventContent({ id }: { id: string }) {
  // Suspends until the event is here; loading and errors never reach this JSX.
  const event = useEvent(id);
  // Waiting for the session check keeps a signed-in visitor from being
  // treated as a guest for a moment.
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [guest, setGuest] = useState<GuestIdentity | null>(() => loadGuest());

  // One resolved identity instead of three booleans scattered in the JSX.
  const viewer = resolveViewer({
    sessionPending,
    session: session ?? null,
    guest,
  });

  function handleJoin(name: string) {
    setGuest(saveGuest(name));
  }

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="flex-grow items-center justify-center gap-4 p-6"
    >
      <View
        className="w-full gap-3 rounded-lg border border-line bg-surface p-7"
        style={{ maxWidth: 420 }}
      >
        <EventHeader event={event} />
        <EventDetails event={event} />
      </View>

      <AvailabilityCard>
        <AnsweringArea event={event} viewer={viewer} onJoin={handleJoin} />
      </AvailabilityCard>
    </ScrollView>
  );
}
