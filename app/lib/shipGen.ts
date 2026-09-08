import type { Web2ShipEquipment, Web2ShipTraits } from "../types/web2Ship";
import rawNames from "./shipNames.json";
import { calcShipCost, CURRENT_COSTS_VERSION } from "./shipCosts";
import { validSpecialsForVariant } from "../types/types";

export { calcShipCost, CURRENT_COSTS_VERSION };

const SHIP_NAMES = rawNames as string[];

function rng(seed: number, max: number): number {
  // Simple deterministic pseudo-random based on seed
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

export function generateShip(
  ownerId: string,
  index: number,
  costs?: import("./shipCosts").CostsConfig,
): { name: string; equipment: Web2ShipEquipment; traits: Web2ShipTraits; cost: number; costsVersion: number; shiny: boolean } {
  const seed = Date.now() + index * 997;

  // Variant must be rolled before special — variant 2 ("Drone" faction) uses
  // a disjoint Special value set (Slot 4/5/6, not variant 1's Slot 1/2/3),
  // so which special values are even valid depends on the variant rolled.
  const variant = rng(seed + 11, 3);
  const validSpecials = validSpecialsForVariant(variant);

  // armor and shields are mutually exclusive: roll a shared defense level and a type
  const defenseLevel = rng(seed + 2, 4); // 0–3
  const preferArmor  = rng(seed + 3, 2) === 0; // 50/50 armor vs shields
  const equipment: Web2ShipEquipment = {
    mainWeapon: rng(seed + 1, 4),
    armor:      defenseLevel > 0 && preferArmor  ? defenseLevel : 0,
    shields:    defenseLevel > 0 && !preferArmor ? defenseLevel : 0,
    special:    validSpecials[rng(seed + 4, validSpecials.length)],
  };

  const traits: Web2ShipTraits = {
    serialNumber: seed,
    colors: {
      h1: rng(seed + 5, 360),
      s1: 40 + rng(seed + 6, 40),
      l1: 40 + rng(seed + 7, 30),
      h2: rng(seed + 8, 360),
      s2: 40 + rng(seed + 9, 40),
      l2: 40 + rng(seed + 10, 30),
    },
    variant,
    accuracy: rng(seed + 12, 3),
    hull:     rng(seed + 13, 3),
    speed:    rng(seed + 14, 3),
  };

  const nameIdx = rng(seed + 15, SHIP_NAMES.length);
  const shiny = rng(seed + 16, 100) < 5; // 5% shiny

  void ownerId; // used by callers for ownership context

  return {
    name: SHIP_NAMES[nameIdx] ?? "Ship",
    equipment,
    traits,
    cost: calcShipCost(equipment, traits, costs),
    costsVersion: costs?.version ?? CURRENT_COSTS_VERSION,
    shiny,
  };
}
