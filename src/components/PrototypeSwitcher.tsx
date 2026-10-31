import { router } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export type VariantOption = {
  key: string;
  name: string;
};

type PrototypeSwitcherProps = {
  variants: VariantOption[];
  current: string;
  pathname?: string;
};

export function PrototypeSwitcher({
  variants,
  current,
  pathname = "/prototype/flow",
}: PrototypeSwitcherProps) {
  // Hide in production builds
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const currentIndex = Math.max(
    0,
    variants.findIndex((v) => v.key === current)
  );

  const goToVariant = (nextKey: string) => {
    router.replace({
      pathname: pathname as any,
      params: { variant: nextKey },
    });
  };

  const prev = () => {
    const nextIndex = (currentIndex - 1 + variants.length) % variants.length;
    goToVariant(variants[nextIndex].key);
  };

  const next = () => {
    const nextIndex = (currentIndex + 1) % variants.length;
    goToVariant(variants[nextIndex].key);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, variants]);

  const currentOption = variants[currentIndex] ?? variants[0];

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          onPress={prev}
          accessibilityLabel="Previous variant"
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
        >
          <Text style={styles.arrowText}>←</Text>
        </Pressable>

        <View style={styles.labelWrap}>
          <Text style={styles.badgeText}>PROTOTYPE</Text>
          <Text style={styles.variantLabel}>
            {currentOption.key} · {currentOption.name}
          </Text>
        </View>

        <Pressable
          onPress={next}
          accessibilityLabel="Next variant"
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
        >
          <Text style={styles.arrowText}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#162620",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(127,224,184,0.25)",
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: "rgba(127,224,184,0.2)",
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  labelWrap: {
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#7FE0B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  variantLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
