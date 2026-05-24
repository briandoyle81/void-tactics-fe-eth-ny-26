import type { ShipEquipment, ShipTraits } from "../types/types";
import rawNames from "./shipNames.json";

const SHIP_NAMES = rawNames as string[];

// Equipment costs mirror the on-chain Ships contract cost model
const EQUIPMENT_COST: Record<string, number[]> = {
  weapon:  [10, 20, 25, 30],  // laser, railgun, missile, plasma
  armor:   [0,  10, 20, 30],  // none, light, medium, heavy
  shields: [0,  10, 20, 30],
  special: [0,  15, 20, 25],
};

export function calcShipCost(eq: ShipEquipment): number {
  return (
    (EQUIPMENT_COST.weapon[eq.mainWeapon]  ?? 10) +
    (EQUIPMENT_COST.armor[eq.armor]        ?? 0)  +
    (EQUIPMENT_COST.shields[eq.shields]    ?? 0)  +
    (EQUIPMENT_COST.special[eq.special]    ?? 0)
  );
}

function rng(seed: number, max: number): number {
  // Simple deterministic pseudo-random based on seed
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

export function generateShip(
  ownerId: string,
  index: number,
): { name: string; equipment: ShipEquipment; traits: ShipTraits; cost: number; shiny: boolean } {
  const seed = Date.now() + index * 997;

  const equipment: ShipEquipment = {
    mainWeapon: rng(seed + 1, 4),
    armor:      rng(seed + 2, 4),
    shields:    rng(seed + 3, 4),
    special:    rng(seed + 4, 4),
  };

  const traits: ShipTraits = {
    serialNumber: BigInt(seed),
    colors: {
      h1: rng(seed + 5, 360),
      s1: 40 + rng(seed + 6, 40),
      l1: 40 + rng(seed + 7, 30),
      h2: rng(seed + 8, 360),
      s2: 40 + rng(seed + 9, 40),
      l2: 40 + rng(seed + 10, 30),
    },
    variant:  rng(seed + 11, 3),
    accuracy: rng(seed + 12, 3),
    hull:     rng(seed + 13, 3),
    speed:    rng(seed + 14, 3),
  };

  const nameIdx = rng(seed + 15, SHIP_NAMES.length);
  const shiny = rng(seed + 16, 100) < 5; // 5% shiny

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void ownerId; // used by callers for ownership context

  return {
    name: SHIP_NAMES[nameIdx] ?? "Ship",
    equipment,
    traits,
    cost: calcShipCost(equipment),
    shiny,
  };
}
