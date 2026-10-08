import { describe, it, expect } from "vitest";
import { computeScore } from "@/lib/game";

describe("scoring", () => {
  it("perfect run at par scores 1000", () => {
    expect(computeScore({ parMinutes: 10 }, 10, 3, 0, 2, true).total).toBe(1000);
  });
  it("unresolved incident gets 0 MTTR score", () => {
    expect(computeScore({ parMinutes: 10 }, 8, 1, 1, 0, false).mttrScore).toBe(0);
  });
  it("each minute over par costs 5 MTTR points", () => {
    expect(computeScore({ parMinutes: 10 }, 14, 3, 0, 2, true).mttrScore).toBe(80);
  });
});
