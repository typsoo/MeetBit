import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import { EventContent } from "./EventContent";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { ScreenMessage } from "@/components/ui/ScreenMessage";

/**
 * The route entry: no loading or error branches in the screen itself. The
 * event query suspends into the fallback below, and anything it throws lands
 * in QueryBoundary.
 */
/** Shown while the event query suspends. */
function EventScreenSkeleton() {
  return <ScreenMessage title="Loading the event…" />;
}

export function EventScreen({ id }: { id: string | null }) {
  if (id === null) {
    return <ScreenMessage title="Event not found." />;
  }

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <QueryBoundary onReset={reset} failureTitle="Could not load the event.">
          <Suspense fallback={<EventScreenSkeleton />}>
            <EventContent id={id} />
          </Suspense>
        </QueryBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
