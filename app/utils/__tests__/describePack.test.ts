import { describe, expect, it } from "vitest";
import { describePack } from "../shipPurchaseTierDisplay";

describe("describePack", () => {
  it("counts the veterans and names the top rank", () => {
    expect(describePack(4, 60)).toBe("60 ships, led by 4 veterans up to Rank 5.");
    expect(describePack(2, 22)).toBe("22 ships, led by 2 veterans up to Rank 3.");
  });

  it("handles a single veteran and no veterans", () => {
    expect(describePack(1, 11)).toBe("11 ships, led by a Rank 2 veteran.");
    expect(describePack(0, 5)).toBe("5 ships to build your navy.");
  });
});
