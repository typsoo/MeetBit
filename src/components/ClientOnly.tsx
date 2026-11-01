import { useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

type Props = {
  children: ReactNode;
  /** Rendered on the server and during the first client render. */
  fallback: ReactNode;
};

/**
 * Expo renders routes on the server first (`web.output: "server"`). Suspense
 * queries cannot fetch there, and rendering one tree on the server and another
 * on the client breaks hydration — so the first client render repeats the
 * server output, and the children mount right after.
 *
 * Native has no server render, so it starts mounted and never flashes.
 */
export function ClientOnly({ children, fallback }: Props) {
  const [mounted, setMounted] = useState(() => Platform.OS !== "web");

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : fallback;
}
