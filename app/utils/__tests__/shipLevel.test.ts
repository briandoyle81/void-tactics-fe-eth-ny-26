import { describe, it, expect, afterEach } from "vitest";
import {
  calculateShipRank,
  getRankProgressInfo,
  calculateShipTier,
  getRankColor,
  getTierColor,
} from "../shipLevel";
import { setRankConfig, DEFAULT_RANK_CONFIG } from "../rankConfigCache";
import { ShipVisual } from "../../types/shipVisual";

function makeShip(overrides: {
  shipsDestroyed?: number;
  accuracy?: number;
  hull?: number;
  speed?: number;
  variant?: number;
}): ShipVisual {
  return {
    equipment: { mainWeapon: 0, armor: 0, shields: 0, special: 0 },
    traits: {
      colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0 },
      variant: overrides.variant ?? 0,
      accuracy: overrides.accuracy ?? 50,
      hull: overrides.hull ?? 50,
      speed: overrides.speed ?? 50,
    },
    shipData: {
      shipsDestroyed: overrides.shipsDestroyed ?? 0,
      shiny: false,
      constructed: true,
      timestampDestroyed: 0,
    },
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

// Regression coverage for the rank-hardcoding fix (see rankConfigCache.ts):
// rank used to be permanently pinned to a hardcoded 10/30/100/300/1000
// ladder no matter what an admin published on-chain/in the DB for a
// variant. It must now track that variant's live rankConfigCache entry.
describe("calculateShipRank / getRankProgressInfo — live per-variant config", () => {
  const CUSTOM_VARIANT = 42;

  afterEach(() => {
    setRankConfig(CUSTOM_VARIANT, DEFAULT_RANK_CONFIG);
  });

  it("uses a variant's own published thresholds instead of the default ladder", () => {
    setRankConfig(CUSTOM_VARIANT, { thresholds: [5, 15], bonusPct: [0, 50, 100] });

    // 4 kills is below variant 42's custom rank-2 threshold (5) but well
    // past the default ladder's would-be rank-1 range too — the point is
    // it must resolve against variant 42's numbers, not the default's.
    expect(calculateShipRank(makeShip({ shipsDestroyed: 4, variant: CUSTOM_VARIANT })).rank).toBe(1);
    expect(calculateShipRank(makeShip({ shipsDestroyed: 5, variant: CUSTOM_VARIANT })).rank).toBe(2);
    expect(calculateShipRank(makeShip({ shipsDestroyed: 15, variant: CUSTOM_VARIANT })).rank).toBe(3);

    // A ship of an untouched variant is unaffected by variant 42's override.
    expect(calculateShipRank(makeShip({ shipsDestroyed: 5, variant: 0 })).rank).toBe(1);
  });

  it("caps nextRank/killsToNextRank at the variant's own tier count", () => {
    setRankConfig(CUSTOM_VARIANT, { thresholds: [5, 15], bonusPct: [0, 50, 100] });

    const info = getRankProgressInfo(makeShip({ shipsDestroyed: 15, variant: CUSTOM_VARIANT }));
    expect(info.rank).toBe(3);
    expect(info.nextRank).toBeNull(); // rank 3 is variant 42's max (bonusPct has 3 entries)
    expect(info.killsToNextRank).toBeNull();
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
