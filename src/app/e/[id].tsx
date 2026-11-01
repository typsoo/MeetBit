import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

import { AvailabilityGrid, type Cell } from "@/components/grid";
import { SlotInfoCard } from "@/components/SlotInfoCard";
import { authClient } from "@/lib/auth-client";
import {
  formatDate,
  formatDayHeader,
  formatMinutes,
  isoDaysBetween,
} from "@/lib/format";
import { loadGuest, saveGuest, type GuestIdentity } from "@/lib/guest";
import { useTRPC } from "@/lib/trpc";
import type { EventView } from "@/server/routers/event";

type LoadState =
  | { tag: "loading" }
  | { tag: "ready"; event: EventView }
  | { tag: "notFound" }
  | { tag: "error" };

const statusLabels: Record<EventView["status"], string> = {
  open: "Open for answers",
  approved: "Meeting scheduled",
};

/** Reads the tRPC error code from an unknown thrown error. */
function errorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    return (error as { data?: { code?: string } }).data?.code ?? null;
  }
  return null;
}

export default function EventScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : null;

  const trpc = useTRPC();
  // '' is a placeholder: with enabled=false the query never fires, so the
  // input shape stays valid even while the id is still unknown.
  const eventQuery = useQuery(
    trpc.event.getByShortId.queryOptions(
      { id: id ?? "" },
      { enabled: id !== null },
    ),
  );

  const state: LoadState = !id
    ? { tag: "notFound" }
    : eventQuery.error
      ? errorCode(eventQuery.error) === "NOT_FOUND"
        ? { tag: "notFound" }
        : { tag: "error" }
      : eventQuery.data
        ? { tag: "ready", event: eventQuery.data }
        : { tag: "loading" };

  // The join form only makes sense for visitors without an account. Waiting
  // for the session check avoids flashing the form at a signed-in user.
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [guest, setGuest] = useState<GuestIdentity | null>(() => loadGuest());
  // A returning guest gets their stored name prefilled but can still change
  // it for a new event. The identifier stays the same either way.
  const [nickInput, setNickInput] = useState(guest?.name ?? "");
  const [nickError, setNickError] = useState<string | null>(null);
  // Busy cells keyed "YYYY-MM-DD:slotNumber", local until saved (ticket 06).
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  // Slot whose details card is open. The lists are empty until ticket 11
  // supplies aggregate.heatmap; the card shows dashes in the meantime.
  const [selectedSlot, setSelectedSlot] = useState<Cell | null>(null);

  const queryClient = useQueryClient();

  const guestForApi = guest ? { id: guest.id, name: guest.name } : undefined;
  const hasIdentity = !sessionPending && (session !== null || guest !== null);

  // The saved grid hydrates the local one once; later refetches must not
  // wipe unsaved marks.
  const availabilityQuery = useQuery(
    trpc.availability.get.queryOptions(
      { eventId: id ?? "", guest: guestForApi },
      { enabled: id !== null && hasIdentity },
    ),
  );
  const hydratedRef = useRef(false);
  useEffect(() => {
    const saved = availabilityQuery.data;
    if (hydratedRef.current || !saved) {
      return;
    }
    hydratedRef.current = true;
    setBusy(
      new Set(saved.busySlots.map((slot) => `${slot.date}:${slot.slotNumber}`)),
    );
  }, [availabilityQuery.data]);

  const saveAvailability = useMutation({
    ...trpc.availability.save.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.availability.get.queryKey({
          eventId: id ?? "",
          guest: guestForApi,
        }),
      });
    },
  });

  function handleJoin() {
    const name = nickInput.trim();
    if (!name) {
      setNickError("Name is required");
      return;
    }
    if (name.length > 50) {
      setNickError("Keep the name under 50 characters");
      return;
    }
    setNickError(null);
    setGuest(saveGuest(name));
  }

  function handleSave() {
    if (state.tag !== "ready") {
      return;
    }

    const busySlots = Array.from(busy, (key) => {
      const [date, slot] = key.split(":");
      return { date, slotNumber: Number(slot) };
    });

    saveAvailability.mutate({
      eventId: state.event.id,
      guest: session
        ? undefined
        : guest
          ? { id: guest.id, name: guest.name }
          : undefined,
      busySlots,
    });
  }

  if (state.tag === "loading") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Loading the event…</Text>
      </View>
    );
  }

  if (state.tag === "notFound") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Event not found</Text>
        <Text style={styles.muted}>
          The link is broken or the event was deleted.
        </Text>
      </View>
    );
  }

  if (state.tag === "error") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>Could not load the event.</Text>
      </View>
    );
  }

  const { event } = state;
  const days = isoDaysBetween(event.startDate, event.endDate);
  const slotsPerDay =
    (event.workEndMinutes - event.workStartMinutes) / event.stepMinutes;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{event.name}</Text>
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}

        <View style={styles.details}>
          <DetailRow
            label="Dates"
            value={`${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
          />
          <DetailRow
            label="Working hours"
            value={`${formatMinutes(event.workStartMinutes)} – ${formatMinutes(event.workEndMinutes)}`}
          />
          <DetailRow label="Grid step" value={`${event.stepMinutes} min`} />
          <DetailRow label="Timezone" value={event.timezone} />
          <DetailRow label="Status" value={statusLabels[event.status]} />
        </View>

        {session || sessionPending ? null : availabilityQuery.data ? (
          <View style={styles.joining}>
            <Text style={styles.joiningText}>
              You are answering as{" "}
              <Text style={styles.joiningName}>
                {availabilityQuery.data.name}
              </Text>
              . Your name is locked for this event.
            </Text>
          </View>
        ) : (
          <View style={styles.joining}>
            <Text style={styles.joiningText}>
              Answer without an account: pick a name your group recognizes.
            </Text>
            <TextInput
              style={styles.nickInput}
              value={nickInput}
              onChangeText={(value) => {
                setNickInput(value);
                setNickError(null);
              }}
              placeholder="Your name"
              maxLength={50}
            />
            {nickError ? <Text style={styles.error}>{nickError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleJoin}
              style={({ pressed }) => [
                styles.joinButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.joinButtonText}>Join as a guest</Text>
            </Pressable>
            {guest ? (
              <Text style={styles.joiningText}>
                You are joining as{" "}
                <Text style={styles.joiningName}>{guest.name}</Text>.
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.gridCard}>
        <Text style={styles.gridTitle}>When are you busy?</Text>
        <Text style={styles.muted}>
          Hold and drag across cells to mark busy times; drag over marked cells
          to clear them. Saving replaces your whole previous grid.
        </Text>
        <AvailabilityGrid
          days={days}
          slotsPerDay={slotsPerDay}
          workStartMinutes={event.workStartMinutes}
          stepMinutes={event.stepMinutes}
          busy={busy}
          onChange={setBusy}
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
        <View style={styles.saveRow}>
          {session ? (
            <Text style={styles.muted}>
              You will answer as {session.user.name}.
            </Text>
          ) : !guest ? (
            <Text style={styles.muted}>
              Join with a name above to save your grid.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={
              saveAvailability.isPending || (!session && !guest)
            }
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              (saveAvailability.isPending || (!session && !guest)) &&
                styles.disabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saveAvailability.isPending ? "Saving…" : "Save my availability"}
            </Text>
          </Pressable>
          {saveAvailability.error ? (
            <Text style={styles.error}>{saveAvailability.error.message}</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f3f1f2",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  centered: {
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
    padding: 28,
    borderRadius: 16,
    backgroundColor: "#fbf9fa",
    borderWidth: 1,
    borderColor: "#ded8da",
  },
  gridCard: {
    width: "100%",
    maxWidth: 900,
    gap: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fbf9fa",
    borderWidth: 1,
    borderColor: "#ded8da",
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    fontSize: 16,
    color: "#4a4448",
  },
  details: {
    gap: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e8e2e4",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b6368",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  joining: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e8e2e4",
  },
  saveRow: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e8e2e4",
  },
  saveButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#23644f",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  disabled: {
    opacity: 0.55,
  },
  joiningText: {
    fontSize: 14,
    color: "#6b6368",
  },
  joiningName: {
    fontWeight: "700",
    color: "#23644f",
  },
  nickInput: {
    borderWidth: 1,
    borderColor: "#ded8da",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  joinButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#23644f",
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.8,
  },
  muted: {
    fontSize: 14,
    color: "#6b6368",
  },
  error: {
    fontSize: 14,
    color: "#8a2f2f",
  },
});
