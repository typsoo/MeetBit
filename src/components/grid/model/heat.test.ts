import { describe, expect, it } from "vitest";

import { levelForShare } from "./heat";

describe("levelForShare", () => {
  it("puts an empty slot on the busiest step", () => {
    expect(levelForShare(0)).toBe(0);
  });

  it("splits the middle into three bands", () => {
    expect(levelForShare(0.1)).toBe(1);
    expect(levelForShare(1 / 3)).toBe(1);
    expect(levelForShare(0.5)).toBe(2);
    expect(levelForShare(2 / 3)).toBe(2);
    expect(levelForShare(0.9)).toBe(3);
  });

  it("puts a fully free slot on its own step", () => {
    expect(levelForShare(1)).toBe(4);
  });
});
