/**
 * Ship cost tables — mirrors ShipAttributes.setCosts (per-variant, as of
 * the 2026-09-20/21 redesign — see
 * docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §2).
 * The authoritative values are stored in the DB Config table (keys:
 * "ship_costs_v1"/"ship_costs_v2") and managed via the (web2) Ship
 * Attributes admin panel's per-variant picker. These are the fallback
 * defaults when the DB has no config row yet for a given variant (same
 * split as shipAttributeTables.ts: pure/client-safe defaults here, prisma
 * read in getCurrentCosts.ts).
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

// Costs are identical between variant 1 and 2 except the special-slot
// column (see the doc above §2) — only `special` differs below.
const SHARED_DEFAULTS = {
  baseCost: 50,
  accuracy: [0, 10, 25],
  hull: [0, 10, 25],
  speed: [0, 10, 25],
  mainWeapon: [25, 30, 40, 40], // Generic/Sniper/Missile/Close (variant 1: laser/railgun/missile/plasma)
  armor: [0, 5, 10, 15], // none, light, medium, heavy
  shields: [0, 10, 20, 30],
};

export const DEFAULT_COSTS_V1: CostsConfig = {
  version: DEFAULT_COSTS_VERSION,
  ...SHARED_DEFAULTS,
  special: [0, 10, 20, 15], // None, EMP, Repair Drones, Flak Array
};

export const DEFAULT_COSTS_V2: CostsConfig = {
  version: DEFAULT_COSTS_VERSION,
  ...SHARED_DEFAULTS,
  special: [0, 15, 20, 10], // None, Electric Storm, Drone Swarm, Additional Thruster
};

export const DEFAULT_COSTS_BY_VARIANT: Record<number, CostsConfig> = {
  1: DEFAULT_COSTS_V1,
  2: DEFAULT_COSTS_V2,
};

export function defaultCostsForVariant(variant: number): CostsConfig {
  return DEFAULT_COSTS_BY_VARIANT[variant] ?? DEFAULT_COSTS_V1;
}

// Back-compat aliases for any lingering variant-1-only call sites.
export const DEFAULT_COSTS = DEFAULT_COSTS_V1;
export const CURRENT_COSTS_VERSION = DEFAULT_COSTS_VERSION;

export function calcShipCost(
  equipment: { mainWeapon: number; armor: number; shields: number; special: number },
  traits: { accuracy: number; hull: number; speed: number },
  costs: CostsConfig,
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
