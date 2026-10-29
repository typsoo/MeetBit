import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

type ServerStatus = "checking" | "ok" | "error";

const statusLabels: Record<ServerStatus, string> = {
  checking: "checking…",
  ok: "ok",
  error: "unreachable",
};

export default function HomeScreen() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let active = true;

    trpc.system.status
      .query()
      .then((result) => {
        if (active) {
          setStatus(result.status === "ok" ? "ok" : "error");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MeetBit</Text>
      <Text style={styles.subtitle}>Find a time that works for everyone.</Text>
      <Text style={styles.status}>Server: {statusLabels[status]}</Text>
      <Link href="/prototype/grid" style={styles.link}>
        Grid prototype →
      </Link>
      <Link href="/prototype/palette" style={styles.link}>
        Palette & UI Kit prototype →
      </Link>
      <Link href="/prototype/flow" style={styles.link}>
        Flow: Voting & Finalize (Variants A/B) →
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  status: {
    fontSize: 13,
    opacity: 0.6,
  },
  link: {
    marginTop: 16,
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
});
