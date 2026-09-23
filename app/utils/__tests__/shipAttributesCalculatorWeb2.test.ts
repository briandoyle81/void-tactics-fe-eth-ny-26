import { describe, it, expect } from "vitest";
import { calculateAttributesFromContractsWeb2 } from "../shipAttributesCalculatorWeb2";
import { DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT } from "../../lib/shipAttributeTables";
import { Web2Ship } from "../../types/web2Ship";

// Mirrors app/utils/__tests__/shipAttributesCalculator.test.ts's coverage
// for the web3 calculator — regression tests for the 2026-09-20/21 redesign
// that made web2's DB-backed attribute tables per-variant too (previously a
// single flat table applied variant 1's numbers to every ship regardless of
// its own traits.variant).

function makeShip(overrides: {
  variant?: number;
  mainWeapon?: number;
  armor?: number;
  shields?: number;
  special?: number;
  accuracy?: number;
  hull?: number;
  speed?: number;
  shipsDestroyed?: number;
}): Web2Ship {
  return {
    name: "Test",
    id: 1,
    equipment: {
      mainWeapon: overrides.mainWeapon ?? 0,
      armor: overrides.armor ?? 0,
      shields: overrides.shields ?? 0,
      special: overrides.special ?? 0,
    },
    traits: {
      serialNumber: 0,
      colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0 },
      variant: overrides.variant ?? 1,
      accuracy: overrides.accuracy ?? 0,
      hull: overrides.hull ?? 0,
      speed: overrides.speed ?? 0,
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
    owner: "test-user",
  };
}

describe("calculateAttributesFromContractsWeb2 — per-variant table selection", () => {
  it("variant 1 ship gets variant 1's base hull (100)", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.hullPoints).toBe(100);
  });

  it("variant 2 ship gets variant 2's base hull (125), not variant 1's", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.hullPoints).toBe(125);
  });

  it("variant 2's Close-slot gun (Mining Drill): range=1, damage=95", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2, mainWeapon: 3 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.range).toBe(1);
    expect(attrs.gunDamage).toBe(95);
  });

  it("variant 2 heavy armor: 60% damage reduction (vs variant 1's 45%)", () => {
    const v1 = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1, armor: 3 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    const v2 = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2, armor: 3 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(v1.damageReduction).toBe(45);
    expect(v2.damageReduction).toBe(60);
  });

  it("an unrecognized variant falls back to variant 1's table rather than throwing", () => {
    expect(() =>
      calculateAttributesFromContractsWeb2(makeShip({ variant: 0 }), DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT),
    ).not.toThrow();
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 0 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.hullPoints).toBe(100);
  });
});

describe("calculateAttributesFromContractsWeb2 — movement", () => {
  it("variant 1, no equipment: movement 5 (base 4 + none-armor-and-shields +1)", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.movement).toBe(5);
  });

  it("variant 2, no equipment: movement 4 (base 3 + none-armor-and-shields +1)", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(attrs.movement).toBe(4);
  });

  it("variant 2's Additional Thruster (special slot 3) adds +3 movement", () => {
    const base = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2, special: 0 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    const thruster = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2, special: 3 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    expect(thruster.movement).toBe(base.movement + 3);
  });

  it("only shields equipped does not double-count the none-armor bonus", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1, armor: 0, shields: 1 }), // shields Light: dr 15, movement +1
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    // base 4 + shield movement +1 (no none-armor bonus, since shields is equipped)
    expect(attrs.movement).toBe(5);
  });
});

describe("calculateAttributesFromContractsWeb2 — rank (per-variant table data, not a hardcoded constant)", () => {
  it("rank 6 (1000 kills) applies variant 1's 50% bonus", () => {
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1, mainWeapon: 1, shipsDestroyed: 1000 }),
      DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
    );
    // Railgun base range 6 + 50% = 9
    expect(attrs.range).toBe(9);
  });

  it("a custom per-variant rank table (admin-edited) is honored, not the other variant's", () => {
    const customTables = {
      1: DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT[1]!,
      2: {
        ...DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT[2]!,
        rankThresholds: [5, 15, 50, 150, 500],
        rankBonusPct: [0, 25, 50, 75, 90, 100],
      },
    };
    const attrs = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 2, shipsDestroyed: 5, mainWeapon: 0 }),
      customTables,
    );
    // Variant 2 Generic gun base range 2; rank 2 (5 kills reaches the
    // custom threshold) applies the custom 25% bonus -> 2 + floor(0.5) = 2
    expect(attrs.range).toBe(2);
    // Variant 1's ship at the same 5 kills stays rank 1 (default thresholds) — no bonus
    const v1 = calculateAttributesFromContractsWeb2(
      makeShip({ variant: 1, shipsDestroyed: 5, mainWeapon: 1 }),
      customTables,
    );
    expect(v1.range).toBe(6);
  });
});
