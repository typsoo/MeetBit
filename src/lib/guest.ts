import { nanoid } from "nanoid";

export type GuestIdentity = {
  id: string;
  name: string;
};

const STORAGE_KEY = "meetbit:guest";

/**
 * Reads the guest identity from localStorage. Any problem — missing storage,
 * corrupted JSON, wrong shape — is reported as "unknown guest" instead of
 * throwing: the app must work for a guest whose storage is unavailable.
 */
export function loadGuest(): GuestIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as GuestIdentity).id !== "string" ||
      typeof (parsed as GuestIdentity).name !== "string"
    ) {
      return null;
    }
    return { id: (parsed as GuestIdentity).id, name: (parsed as GuestIdentity).name };
  } catch {
    return null;
  }
}

/**
 * Saves the guest nickname, keeping the existing identifier when the browser
 * already has one. A cleared storage yields a new identifier on the next
 * join — and with it, a fresh (empty) participation history.
 */
export function saveGuest(name: string): GuestIdentity {
  const guest: GuestIdentity = { id: loadGuest()?.id ?? nanoid(10), name };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
  } catch {
    // Private mode or full storage: the guest stays recognized until the
    // page unloads. Nothing else can be done about it here.
  }
  return guest;
}
