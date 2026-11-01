import type { GuestIdentity } from "@/lib/guest";

/** Minimal shape of a session snapshot; keeps better-auth out of the model. */
type SessionSnapshot = { user: { name?: string | null } } | null;

/**
 * Who is answering. Resolved once from the session probe and the stored
 * guest, so the UI switches on one value instead of three booleans.
 */
export type Viewer =
  | { kind: "checking" }
  | { kind: "anonymous" }
  | { kind: "member"; name: string | null }
  | { kind: "guest"; guest: GuestIdentity };

export function resolveViewer(options: {
  /** True while the session check is in flight. */
  sessionPending: boolean;
  session: SessionSnapshot;
  guest: GuestIdentity | null;
}): Viewer {
  const { sessionPending, session, guest } = options;

  // The session probe decides first: a signed-in visitor is never a guest,
  // even while the probe is still running.
  if (sessionPending) {
    return { kind: "checking" };
  }
  if (session) {
    return { kind: "member", name: session.user.name ?? null };
  }
  if (guest) {
    return { kind: "guest", guest };
  }
  return { kind: "anonymous" };
}
