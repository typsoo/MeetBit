import { describe, expect, it } from "vitest";

import { resolveViewer } from "./viewer";

const guest = { id: "g1", name: "Anna" };

describe("resolveViewer", () => {
  it("is checking while the session probe is in flight", () => {
    expect(
      resolveViewer({ sessionPending: true, session: null, guest: null }),
    ).toEqual({ kind: "checking" });
    expect(
      resolveViewer({ sessionPending: true, session: null, guest }),
    ).toEqual({ kind: "checking" });
  });

  it("prefers a signed-in session over a stored guest", () => {
    expect(
      resolveViewer({
        sessionPending: false,
        session: { user: { name: "Bit" } },
        guest,
      }),
    ).toEqual({ kind: "member", name: "Bit" });
  });

  it("is a member even when the account has no name", () => {
    expect(
      resolveViewer({ sessionPending: false, session: { user: {} }, guest }),
    ).toEqual({ kind: "member", name: null });
  });

  it("falls back to the stored guest", () => {
    expect(
      resolveViewer({ sessionPending: false, session: null, guest }),
    ).toEqual({ kind: "guest", guest });
  });

  it("is anonymous when nothing is known", () => {
    expect(
      resolveViewer({ sessionPending: false, session: null, guest: null }),
    ).toEqual({ kind: "anonymous" });
  });
});
