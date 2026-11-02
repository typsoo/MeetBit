import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

import type { Viewer } from "../model/viewer";
import { busyToSlots, sameBusy, slotsToBusy } from "../model/slots";

type Options = {
  eventId: string;
  /** Member or guest: the anonymous and checking states never reach here. */
  viewer: Extract<Viewer, { kind: "member" | "guest" }>;
};

export type AvailabilityState = {
  busy: Set<string>;
  setBusy: Dispatch<SetStateAction<Set<string>>>;
  save: () => void;
  isSaving: boolean;
  isDirty: boolean;
  /** Name stored with the saved grid; while it exists, the name is locked. */
  savedName: string | null;
  savedAt: string | null;
  error: string | null;
};

/**
 * The participant's grid: the saved snapshot comes from the server, edits
 * stay local until save. Suspense guarantees the snapshot exists on the first
 * render, so the draft starts from it — no hydration effect, no ref.
 *
 * The component using this hook must be mounted only when the identity is
 * known: the query is not conditionally enabled.
 */
export function useAvailability({
  eventId,
  viewer,
}: Options): AvailabilityState {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // A signed-in visitor answers as their account; guests send their identity.
  const guestParam = viewer.kind === "guest" ? viewer.guest : undefined;

  const saved = useSuspenseQuery(
    trpc.availability.get.queryOptions({ eventId, guest: guestParam }),
  );

  // What the server currently has; the save button compares against it.
  const savedSet = useMemo(
    () => slotsToBusy(saved.data?.busySlots ?? []),
    [saved.data],
  );

  const [busy, setBusy] = useState<Set<string>>(() => new Set(savedSet));

  const mutation = useMutation({
    ...trpc.availability.save.mutationOptions(),
    onSuccess: () => {
      // Both views of the same data: the participant's own grid and the
      // aggregate that colors it. One save invalidates them together.
      queryClient.invalidateQueries({
        queryKey: trpc.availability.get.queryKey({
          eventId,
          guest: guestParam,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.aggregate.heatmap.queryKey({ eventId }),
      });
    },
  });

  function save() {
    mutation.mutate({
      eventId,
      guest: guestParam,
      busySlots: busyToSlots(busy),
    });
  }

  return {
    busy,
    setBusy,
    save,
    isSaving: mutation.isPending,
    isDirty: !sameBusy(busy, savedSet),
    savedName: saved.data?.name ?? null,
    savedAt: saved.data?.savedAt ?? null,
    error: mutation.error?.message ?? null,
  };
}
