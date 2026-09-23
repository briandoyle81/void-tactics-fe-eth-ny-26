import { describe, it, expect, afterEach } from "vitest";
import { getRankConfig, setRankConfig, DEFAULT_RANK_CONFIG } from "../rankConfigCache";

// Regression coverage for the rank-hardcoding fix: shipLevel.ts's rank
// display used to be permanently pinned to a hardcoded ladder, ignoring the
// per-variant rankThresholds/rankBonusPct an admin can publish via
// ShipAttributes.setVariantAttributes (web3) or
// /api/admin/ship-attribute-tables (web2). See useRankConfigSync.ts /
// useRankConfigSyncWeb2.ts for the hydrators that call setRankConfig.

const UNTOUCHED_VARIANT = 999; // never written to by any test — always falls back

afterEach(() => {
  // Restore every variant this file touched so tests stay order-independent.
  setRankConfig(1, DEFAULT_RANK_CONFIG);
  setRankConfig(2, DEFAULT_RANK_CONFIG);
});

describe("getRankConfig", () => {
  it("falls back to DEFAULT_RANK_CONFIG for a variant that was never set", () => {
    expect(getRankConfig(UNTOUCHED_VARIANT)).toEqual(DEFAULT_RANK_CONFIG);
  });

  it("returns whatever was published via setRankConfig for that variant", () => {
    setRankConfig(1, { thresholds: [5, 15], bonusPct: [0, 25, 50] });
    expect(getRankConfig(1)).toEqual({ thresholds: [5, 15], bonusPct: [0, 25, 50] });
  });

  it("keeps variants independent", () => {
    setRankConfig(1, { thresholds: [5, 15], bonusPct: [0, 25, 50] });
    expect(getRankConfig(2)).toEqual(DEFAULT_RANK_CONFIG);
  });

  it("ignores an empty update rather than blanking out an already-cached config", () => {
    setRankConfig(1, { thresholds: [5, 15], bonusPct: [0, 25, 50] });
    setRankConfig(1, { thresholds: [], bonusPct: [] });
    expect(getRankConfig(1)).toEqual({ thresholds: [5, 15], bonusPct: [0, 25, 50] });
  });

  it("stores its own copy, not a live reference to the caller's arrays", () => {
    const thresholds = [5, 15];
    setRankConfig(1, { thresholds, bonusPct: [0, 25, 50] });
    thresholds.push(999);
    expect(getRankConfig(1).thresholds).toEqual([5, 15]);
  });
});
