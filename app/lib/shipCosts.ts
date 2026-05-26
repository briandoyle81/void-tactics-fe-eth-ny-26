/**
 * Ship cost tables — mirrors ShipAttributes constructor defaults (v1).
 * The authoritative values are stored in the DB Config table (key: "ship_costs")
 * and managed via the admin panel. These are the fallback defaults when the DB
 * has no config row yet.
 */
export const DEFAULT_COSTS_VERSION = 1;

export type CostsConfig = {
  version: number;
  baseCost: number;
  accuracy: number[];
  hull: number[];
  speed: number[];
  mainWeapon: number[];
  armor: number[];
  shields: number[];
  special: number[];
};

export const DEFAULT_COSTS: CostsConfig = {
  version: DEFAULT_COSTS_VERSION,
  baseCost: 50,
  accuracy:   [0, 10, 25],
  hull:       [0, 10, 25],
  speed:      [0, 10, 25],
  mainWeapon: [25, 30, 40, 40], // laser, railgun, missile, plasma
  armor:      [0,  5,  10, 15], // none, light, medium, heavy
  shields:    [0, 10,  20, 30],
  special:    [0, 10,  20, 15],
};

// Keep CURRENT_COSTS_VERSION as an alias for backwards compat
export const CURRENT_COSTS_VERSION = DEFAULT_COSTS_VERSION;

export function calcShipCost(
  equipment: { mainWeapon: number; armor: number; shields: number; special: number },
  traits: { accuracy: number; hull: number; speed: number },
  costs: CostsConfig = DEFAULT_COSTS,
): number {
  return (
    costs.baseCost +
    (costs.accuracy[traits.accuracy]      ?? 0) +
    (costs.hull[traits.hull]              ?? 0) +
    (costs.speed[traits.speed]            ?? 0) +
    (costs.mainWeapon[equipment.mainWeapon] ?? costs.mainWeapon[0] ?? 25) +
    (costs.armor[equipment.armor]         ?? 0) +
    (costs.shields[equipment.shields]     ?? 0) +
    (costs.special[equipment.special]     ?? 0)
  );
}
