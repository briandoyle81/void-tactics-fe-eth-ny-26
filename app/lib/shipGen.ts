import type { ShipEquipment, ShipTraits } from "../types/types";
import rawNames from "./shipNames.json";
import { calcShipCost, CURRENT_COSTS_VERSION } from "./shipCosts";

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
): { name: string; equipment: ShipEquipment; traits: ShipTraits; cost: number; costsVersion: number; shiny: boolean } {
  const seed = Date.now() + index * 997;

  // armor and shields are mutually exclusive: roll a shared defense level and a type
  const defenseLevel = rng(seed + 2, 4); // 0–3
  const preferArmor  = rng(seed + 3, 2) === 0; // 50/50 armor vs shields
  const equipment: ShipEquipment = {
    mainWeapon: rng(seed + 1, 4),
    armor:      defenseLevel > 0 && preferArmor  ? defenseLevel : 0,
    shields:    defenseLevel > 0 && !preferArmor ? defenseLevel : 0,
    special:    rng(seed + 4, 4),
  };

  const traits: ShipTraits = {
    serialNumber: seed,
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
    cost: calcShipCost(equipment, traits, costs),
    costsVersion: costs?.version ?? CURRENT_COSTS_VERSION,
    shiny,
  };
}
