import { describe, expect, it } from "vitest";

import { createContext } from "./context";
import { appRouter } from "./routers/_app";

describe("system.status", () => {
  it("returns ok", async () => {
    const caller = appRouter.createCaller(createContext({ db: null }));

    await expect(caller.system.status()).resolves.toEqual({ status: "ok" });
  });
});
