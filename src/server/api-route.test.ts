import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/trpc/[...trpc]+api";

describe("GET /api/trpc/system.status", () => {
  it("response ok through API route", async () => {
    const response = await GET(
      new Request("http://localhost/api/trpc/system.status"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: { data: { status: "ok" } },
    });
  });
});
