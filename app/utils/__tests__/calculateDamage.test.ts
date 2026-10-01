import { describe, it, expect } from "vitest";
import { wouldEnterSos } from "../calculateDamage";

describe("wouldEnterSos", () => {
  it("is true when a living ship would drop to 0 hull", () => {
    expect(
      wouldEnterSos(
        { willKill: true, reactorCritical: false },
        { hullPoints: 20, reactorCriticalTimer: 0 },
      ),
    ).toBe(true);
  });

  it("is false when the ship would survive", () => {
    expect(
      wouldEnterSos(
        { willKill: false, reactorCritical: false },
        { hullPoints: 80, reactorCriticalTimer: 0 },
      ),
    ).toBe(false);
  });

  it("is false for a ship already in SOS", () => {
    expect(
      wouldEnterSos(
        { willKill: false, reactorCritical: true },
        { hullPoints: 0, reactorCriticalTimer: 1 },
      ),
    ).toBe(false);
  });

  it("is false when the hit would DESTROY via reactor stack, not SOS", () => {
    expect(
      wouldEnterSos(
        { willKill: true, reactorCritical: true },
        { hullPoints: 10, reactorCriticalTimer: 2 },
      ),
    ).toBe(false);
  });
});
