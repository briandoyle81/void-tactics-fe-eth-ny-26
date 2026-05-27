import { describe, it, expect } from "vitest";
import { calculateAttributesFromContracts } from "../shipAttributesCalculator";
import { Ship } from "../../types/types";

function makeShip(overrides: {
  mainWeapon?: number;
  armor?: number;
  shields?: number;
  special?: number;
  accuracy?: number;
  hull?: number;
  speed?: number;
  shipsDestroyed?: number;
}): Ship {
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
      variant: 0,
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
    owner: "0x0000000000000000000000000000000000000000",
  };
}

describe("calculateAttributesFromContracts — base stats (rank 1, no traits)", () => {
  it("Laser gun: range=3, damage=50", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ mainWeapon: 0 }));
    expect(attrs.range).toBe(3);
    expect(attrs.gunDamage).toBe(50);
  });

  it("Railgun: range=6, damage=40", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ mainWeapon: 1 }));
    expect(attrs.range).toBe(6);
    expect(attrs.gunDamage).toBe(40);
  });

  it("Missile Launcher: range=4, damage=60", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ mainWeapon: 2 }));
    expect(attrs.range).toBe(4);
    expect(attrs.gunDamage).toBe(60);
  });

  it("Plasma Cannon: range=2, damage=80", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ mainWeapon: 3 }));
    expect(attrs.range).toBe(2);
    expect(attrs.gunDamage).toBe(80);
  });

  it("base hull is 100 with no hull trait", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ hull: 0 }));
    expect(attrs.hullPoints).toBe(100);
    expect(attrs.maxHullPoints).toBe(100);
  });

  it("hull trait 2 adds 20 points → 120", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ hull: 2 }));
    expect(attrs.hullPoints).toBe(120);
  });

  it("no armor → 0 damage reduction", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ armor: 0 }));
    expect(attrs.damageReduction).toBe(0);
  });

  it("heavy armor → 45 damage reduction", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ armor: 3 }));
    expect(attrs.damageReduction).toBe(45);
  });
});

describe("calculateAttributesFromContracts — movement", () => {
  // Base speed = 3; no-armor bonus = +1, no-shield bonus = +1 → base 5
  it("no equipment → movement 5 (base 3 + none-armor +1 + none-shield +1)", () => {
    const attrs = calculateAttributesFromContracts(makeShip({}));
    expect(attrs.movement).toBe(5);
  });

  it("missile launcher reduces movement by 1", () => {
    const base = calculateAttributesFromContracts(makeShip({ mainWeapon: 0 }));
    const missile = calculateAttributesFromContracts(makeShip({ mainWeapon: 2 }));
    expect(missile.movement).toBe(base.movement - 1);
  });

  it("heavy armor reduces movement by 2", () => {
    const noArmor = calculateAttributesFromContracts(makeShip({ armor: 0 }));
    const heavyArmor = calculateAttributesFromContracts(makeShip({ armor: 3 }));
    // none-armor gives +1, heavy-armor gives -2 → net difference is -3
    expect(heavyArmor.movement).toBe(noArmor.movement - 3);
  });

  it("speed trait 2 adds 2 to movement", () => {
    const slow = calculateAttributesFromContracts(makeShip({ speed: 0 }));
    const fast = calculateAttributesFromContracts(makeShip({ speed: 2 }));
    expect(fast.movement).toBe(slow.movement + 2);
  });

  it("movement is never negative", () => {
    // Worst case: missile launcher (-1) + heavy armor (-2, vs none +1 = net -3) + heavy shield (-1, vs none +1 = net -2)
    const attrs = calculateAttributesFromContracts(
      makeShip({ mainWeapon: 2, armor: 3, shields: 3, speed: 0 })
    );
    expect(attrs.movement).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateAttributesFromContracts — rank bonuses", () => {
  it("rank 1 (0 kills) applies no bonus", () => {
    const base = calculateAttributesFromContracts(makeShip({ shipsDestroyed: 0, mainWeapon: 1 }));
    expect(base.range).toBe(6); // no rank bonus
  });

  it("rank 2 (10 kills) applies 10% bonus to range", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ shipsDestroyed: 10, mainWeapon: 1 }));
    // Railgun base range 6 + 10% = 6.6 → floor = 6
    expect(attrs.range).toBe(6);
  });

  it("rank 6 (1000 kills) applies 50% bonus", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ shipsDestroyed: 1000, mainWeapon: 1 }));
    // Railgun base range 6 + 50% = 9
    expect(attrs.range).toBe(9);
    // Railgun base damage 40 + 50% = 60
    expect(attrs.gunDamage).toBe(60);
    // Base hull 100 + 50% = 150
    expect(attrs.hullPoints).toBe(150);
  });

  it("rank bonus applies to both hullPoints and maxHullPoints equally", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ shipsDestroyed: 1000 }));
    expect(attrs.hullPoints).toBe(attrs.maxHullPoints);
  });
});

describe("calculateAttributesFromContracts — fore accuracy bonus", () => {
  it("accuracy 0 applies no range bonus", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ accuracy: 0, mainWeapon: 1 }));
    expect(attrs.range).toBe(6); // base railgun
  });

  it("accuracy 1 applies 25% bonus on top of rank bonus", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ accuracy: 1, mainWeapon: 1 }));
    // base 6, rank 1 (no rank bonus), +25% fore = 6 + floor(6*0.25) = 6 + 1 = 7
    expect(attrs.range).toBe(7);
  });

  it("accuracy 2 applies 50% bonus", () => {
    const attrs = calculateAttributesFromContracts(makeShip({ accuracy: 2, mainWeapon: 1 }));
    // base 6 + 50% = 9
    expect(attrs.range).toBe(9);
  });

  it("out-of-bounds accuracy is clamped, not thrown", () => {
    expect(() =>
      calculateAttributesFromContracts(makeShip({ accuracy: 99 }))
    ).not.toThrow();
  });
});

describe("calculateAttributesFromContracts — output shape", () => {
  it("always returns version 1", () => {
    const attrs = calculateAttributesFromContracts(makeShip({}));
    expect(attrs.version).toBe(1);
  });

  it("statusEffects is an empty array", () => {
    const attrs = calculateAttributesFromContracts(makeShip({}));
    expect(attrs.statusEffects).toEqual([]);
  });

  it("reactorCriticalTimer is 0", () => {
    const attrs = calculateAttributesFromContracts(makeShip({}));
    expect(attrs.reactorCriticalTimer).toBe(0);
  });
});
