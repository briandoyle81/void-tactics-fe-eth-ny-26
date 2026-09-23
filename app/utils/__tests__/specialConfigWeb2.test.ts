import { describe, it, expect } from "vitest";
import {
  getSpecialConfigWeb2,
  isAoeSpecialWeb2,
  isActivatableSpecialWeb2,
} from "../specialConfigWeb2";

// Regression coverage for the 2026-09-20/21 redesign: Special is a
// per-faction local slot now, so slot 2 must resolve to a completely
// different ability (and different numbers) for variant 1 vs variant 2 —
// see docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §3.

describe("getSpecialConfigWeb2", () => {
  it("variant 1 slot 2 is Repair Drones (heal 40, range 3)", () => {
    expect(getSpecialConfigWeb2(1, 2)).toEqual({ range: 3, strength: 40, movement: 0 });
  });

  it("variant 2 slot 2 is Drone Swarm (attack 40, range 5) — same strength as Repair Drones by coincidence, different range/effect", () => {
    expect(getSpecialConfigWeb2(2, 2)).toEqual({ range: 5, strength: 40, movement: 0 });
  });

  it("variant 2 slot 1 is Electric Storm, distinct from variant 1's EMP at the same slot", () => {
    expect(getSpecialConfigWeb2(1, 1)).toEqual({ range: 1, strength: 1, movement: 0 });
    expect(getSpecialConfigWeb2(2, 1)).toEqual({ range: 2, strength: 1, movement: 0 });
  });

  it("variant 2 slot 3 (Additional Thruster) is a pure passive movement bonus", () => {
    expect(getSpecialConfigWeb2(2, 3)).toEqual({ range: 0, strength: 0, movement: 3 });
  });
});

describe("isActivatableSpecialWeb2", () => {
  it("Additional Thruster (variant 2 slot 3) cannot be activated — passive only, no on-chain resolver", () => {
    expect(isActivatableSpecialWeb2(2, 3)).toBe(false);
  });

  it("every variant 1 special and variant 2's Electric Storm/Drone Swarm can be activated", () => {
    expect(isActivatableSpecialWeb2(1, 1)).toBe(true);
    expect(isActivatableSpecialWeb2(1, 2)).toBe(true);
    expect(isActivatableSpecialWeb2(1, 3)).toBe(true);
    expect(isActivatableSpecialWeb2(2, 1)).toBe(true);
    expect(isActivatableSpecialWeb2(2, 2)).toBe(true);
  });

  it("None (slot 0) is never activatable", () => {
    expect(isActivatableSpecialWeb2(1, 0)).toBe(false);
    expect(isActivatableSpecialWeb2(2, 0)).toBe(false);
  });
});

describe("isAoeSpecialWeb2", () => {
  it("Flak Array (variant 1 slot 3) and Electric Storm (variant 2 slot 1) are self-centered AoE", () => {
    expect(isAoeSpecialWeb2(1, 3)).toBe(true);
    expect(isAoeSpecialWeb2(2, 1)).toBe(true);
  });

  it("single-target specials are not AoE", () => {
    expect(isAoeSpecialWeb2(1, 1)).toBe(false); // EMP
    expect(isAoeSpecialWeb2(1, 2)).toBe(false); // Repair Drones
    expect(isAoeSpecialWeb2(2, 2)).toBe(false); // Drone Swarm
  });

  it("variant 1's slot 1/2 are not AoE even though variant 2's slot 1 is — the same slot number means different things per faction", () => {
    expect(isAoeSpecialWeb2(1, 1)).toBe(false);
    expect(isAoeSpecialWeb2(2, 1)).toBe(true);
  });
});
