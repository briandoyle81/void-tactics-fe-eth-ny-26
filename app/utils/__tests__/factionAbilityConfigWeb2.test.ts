import { describe, it, expect } from "vitest";
import { getFactionAbilityConfigWeb2 } from "../factionAbilityConfigWeb2";

// Mirrors RamResolver.sol/RepairResolver.sol's own state (range 1 for
// both; Repair heals 50) — see docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §9.
describe("getFactionAbilityConfigWeb2", () => {
  it("variant 1 is Ram: range 1, not a heal, no strength", () => {
    const config = getFactionAbilityConfigWeb2(1);
    expect(config.range).toBe(1);
    expect(config.isHeal).toBe(false);
    expect(config.strength).toBeUndefined();
  });

  it("variant 2 is Repair: range 1, a heal, strength 50", () => {
    const config = getFactionAbilityConfigWeb2(2);
    expect(config.range).toBe(1);
    expect(config.isHeal).toBe(true);
    expect(config.strength).toBe(50);
  });

  it("an unrecognized variant falls back to Ram (variant 1)", () => {
    expect(getFactionAbilityConfigWeb2(0).isHeal).toBe(false);
  });
});
