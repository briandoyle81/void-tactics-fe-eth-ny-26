import { describe, it, expect } from "vitest";
import { hullAfterRoguelikeWin } from "../roguelikeHeal";

const heal = (hullPoints: number, autoHealPercent: number, healAboveFloorPercent = 0, maxHullPoints = 100) =>
  hullAfterRoguelikeWin({ hullPoints, maxHullPoints, autoHealPercent, healAboveFloorPercent });

describe("hullAfterRoguelikeWin", () => {
  it("raises a ship below the auto-heal floor to the floor", () => {
    expect(heal(10, 25)).toBe(25);
  });

  it("never lowers a ship already above the floor", () => {
    expect(heal(60, 25)).toBe(60);
  });

  it("rounds the floor down like the contract's integer math", () => {
    expect(heal(0, 25, 0, 90)).toBe(22);
  });

  it("carries a 0-hull ship forward at 1 under a 0% floor", () => {
    expect(heal(0, 0)).toBe(1);
  });

  it("applies Heal Above Floor on top of the auto-heal floor", () => {
    expect(heal(10, 25, 80)).toBe(80);
    expect(heal(90, 25, 80)).toBe(90);
  });

  it("never exceeds max hull", () => {
    expect(heal(100, 100, 100)).toBe(100);
  });
});
