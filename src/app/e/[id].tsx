import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

import { authClient } from "@/lib/auth-client";
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Date-only strings are formatted by hand: `new Date('2026-11-05')` is parsed
// as UTC midnight and can shift to another day in a local timezone. The grid
// lives in the event's timezone, so ISO strings are used as-is (ADR-0002).
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// Minutes-from-midnight, the server's working-hours format, rendered as HH:MM.
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

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
    trpc.event.getByShortId.queryOptions({ id: id ?? "" }, { enabled: id !== null }),
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

        {session || sessionPending ? null : (
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
