import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadGuest, saveGuest } from "./guest";

// A minimal Map-backed localStorage stands in for the browser API.
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
};

describe("guest identity", () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", localStorageStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports an unknown guest when nothing is stored", () => {
    expect(loadGuest()).toBeNull();
  });

  it("stores the id together with the nickname", () => {
    const guest = saveGuest("Mika");

    expect(loadGuest()).toEqual(guest);
    expect(guest.name).toBe("Mika");
    expect(guest.id).toMatch(/^[\w-]{10}$/);
  });

  it("keeps the identifier when the nickname changes", () => {
    const first = saveGuest("Mika");
    const second = saveGuest("Mika P.");

    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Mika P.");
  });

  it("issues a fresh identifier after the storage is cleared", () => {
    const before = saveGuest("Mika");
    store.clear();

    expect(loadGuest()).toBeNull();

    const after = saveGuest("Mika");
    expect(after.id).not.toBe(before.id);
  });

  it("survives corrupted JSON in the storage", () => {
    store.set("meetbit:guest", "{not json");

    expect(loadGuest()).toBeNull();
  });

  it("survives a stored value of the wrong shape", () => {
    store.set("meetbit:guest", JSON.stringify({ id: 42 }));

    expect(loadGuest()).toBeNull();
  });
});
