import { describe, it, expect } from "vitest";
import { toOnChainActionType } from "../normalizeGameDataView";
import { ActionType } from "../../types/types";

// Regression coverage for the "Ram/Repair submitted as ActionType.Pass"
// bug (docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
// §9): the shared ActionType enum numbers FactionAbility as 7 to avoid
// colliding with web2-only ClaimPoints(5)/Ram(6), but the real on-chain
// enum only goes 0-5 and reverts on anything else — so every real
// `moveShip` call must translate 7 back down to 5 first.
describe("toOnChainActionType", () => {
  it("maps the shared enum's FactionAbility (7) to the real on-chain value (5)", () => {
    expect(toOnChainActionType(ActionType.FactionAbility)).toBe(5);
  });

  it("leaves every value that matches on-chain 1:1 unchanged", () => {
    expect(toOnChainActionType(ActionType.Pass)).toBe(ActionType.Pass);
    expect(toOnChainActionType(ActionType.Shoot)).toBe(ActionType.Shoot);
    expect(toOnChainActionType(ActionType.Retreat)).toBe(ActionType.Retreat);
    expect(toOnChainActionType(ActionType.Assist)).toBe(ActionType.Assist);
    expect(toOnChainActionType(ActionType.Special)).toBe(ActionType.Special);
  });
});
