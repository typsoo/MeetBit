import { describe, expect, it } from "vitest";

import { errorCode, isNotFound } from "./trpc-error";

describe("errorCode", () => {
  it("reads the code tRPC puts on the error", () => {
    expect(errorCode({ data: { code: "NOT_FOUND" } })).toBe("NOT_FOUND");
  });

  it("returns null for anything that is not a tRPC error", () => {
    expect(errorCode(new Error("boom"))).toBeNull();
    expect(errorCode(null)).toBeNull();
    expect(errorCode("NOT_FOUND")).toBeNull();
  });
});

describe("isNotFound", () => {
  it("is true only for NOT_FOUND", () => {
    expect(isNotFound({ data: { code: "NOT_FOUND" } })).toBe(true);
    expect(isNotFound({ data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(false);
  });
});
