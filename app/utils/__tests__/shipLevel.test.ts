import { describe, it, expect } from "vitest";
import {
  calculateShipRank,
  getRankProgressInfo,
  calculateShipTier,
  getRankColor,
  getTierColor,
} from "../shipLevel";
import { Ship } from "../../types/types";

function makeShip(overrides: {
  shipsDestroyed?: number;
  accuracy?: number;
  hull?: number;
  speed?: number;
}): Ship {
  return {
    name: "Test",
    id: 1,
    equipment: { mainWeapon: 0, armor: 0, shields: 0, special: 0 },
    traits: {
      serialNumber: 0,
      colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0 },
      variant: 0,
      accuracy: overrides.accuracy ?? 50,
      hull: overrides.hull ?? 50,
      speed: overrides.speed ?? 50,
    },
    shipData: {
      shipsDestroyed: overrides.shipsDestroyed ?? 0,
      costsVersion: 0,
      cost: 0,
      shiny: false,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0,
      modifiedCount: 0,
      isFree: false,
    },
    owner: "0x0000000000000000000000000000000000000000",
  };
}

describe("calculateShipRank", () => {
  it.each([
    [0, 1],
    [9, 1],
    [10, 2],
    [29, 2],
    [30, 3],
    [99, 3],
    [100, 4],
    [299, 4],
    [300, 5],
    [999, 5],
    [1000, 6],
    [9999, 6],
  ])("%i kills → rank %i", (kills, expectedRank) => {
    const { rank } = calculateShipRank(makeShip({ shipsDestroyed: kills }));
    expect(rank).toBe(expectedRank);
  });

  it("returns the shipsDestroyed value unchanged", () => {
    const { shipsDestroyed } = calculateShipRank(makeShip({ shipsDestroyed: 42 }));
    expect(shipsDestroyed).toBe(42);
  });
});

describe("getRankProgressInfo", () => {
  it("rank 1 ship needs 10 kills for rank 2", () => {
    const info = getRankProgressInfo(makeShip({ shipsDestroyed: 3 }));
    expect(info.nextRank).toBe(2);
    expect(info.killsToNextRank).toBe(7);
  });

  it("rank 6 ship has null nextRank and killsToNextRank", () => {
    const info = getRankProgressInfo(makeShip({ shipsDestroyed: 1000 }));
    expect(info.nextRank).toBeNull();
    expect(info.killsToNextRank).toBeNull();
  });

  it("killsToNextRank is never negative", () => {
    // Exactly at threshold boundary
    const info = getRankProgressInfo(makeShip({ shipsDestroyed: 10 }));
    expect(info.killsToNextRank).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateShipTier", () => {
  it.each([
    [80, 80, 80, "S", 4],
    [65, 65, 65, "A", 3],
    [50, 50, 50, "B", 2],
    [30, 30, 30, "C", 1],
    // boundary: average exactly 80 → S
    [80, 80, 80, "S", 4],
    // boundary: average exactly 65 → A
    [65, 65, 65, "A", 3],
    // boundary: average exactly 50 → B
    [50, 50, 50, "B", 2],
  ])(
    "accuracy=%i hull=%i speed=%i → tier %s (numeric %i)",
    (accuracy, hull, speed, expectedTier, expectedNumeric) => {
      const result = calculateShipTier(makeShip({ accuracy, hull, speed }));
      expect(result.tier).toBe(expectedTier);
      expect(result.numericTier).toBe(expectedNumeric);
    }
  );

  it("averageStat is rounded", () => {
    // (51 + 51 + 52) / 3 = 51.33... → rounded to 51
    const { averageStat } = calculateShipTier(makeShip({ accuracy: 51, hull: 51, speed: 52 }));
    expect(Number.isInteger(averageStat)).toBe(true);
  });
});

describe("getRankColor", () => {
  it("returns a non-empty string for ranks 1–6", () => {
    for (let rank = 1; rank <= 6; rank++) {
      expect(getRankColor(rank)).toBeTruthy();
    }
  });

  it("falls back to muted style for out-of-range rank", () => {
    expect(getRankColor(0)).toContain("text-text-muted");
    expect(getRankColor(7)).toContain("text-text-muted");
  });
});

describe("getTierColor", () => {
  it("returns a non-empty string for tiers S A B C", () => {
    for (const tier of ["S", "A", "B", "C"]) {
      expect(getTierColor(tier)).toBeTruthy();
    }
  });

  it("falls back to muted style for unknown tier", () => {
    expect(getTierColor("X")).toContain("text-text-muted");
  });
});
