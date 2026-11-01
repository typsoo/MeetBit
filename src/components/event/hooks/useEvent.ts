import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";
import type { EventView } from "@/server/routers/event";

/**
 * Suspends until the event is here. A missing event or a failed request is
 * thrown to the boundary above, so the caller never checks loading state.
 */
export function useEvent(id: string): EventView {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.event.getByShortId.queryOptions({ id })).data;
}
