import { useSuspenseQuery } from "@tanstack/react-query";

import type { Heatmap } from "@/server/aggregate";
import { useTRPC } from "@/lib/trpc";

/**
 * Suspends until the aggregate is here. Read-only and identity-free: the
 * whole point of the heatmap is what everyone answered.
 */
export function useHeatmap(eventId: string): Heatmap {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.aggregate.heatmap.queryOptions({ eventId }))
    .data;
}
