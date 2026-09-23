/**
 * Ship attribute stat tables — mirrors the ShipAttributes contract's
 * per-variant VariantAttributeData (gun/armor/shield/hull/speed/rank
 * tables), as of the 2026-09-20/21 redesign that made attributes versioned
 * per variant instead of one global table. The authoritative values are
 * stored in the DB Config table (keys: "ship_attribute_tables" for variant
 * 1, "ship_attribute_tables_v2" for variant 2) and managed via the (web2)
 * Ship Attributes admin panel's per-variant picker. These are the fallback
 * defaults when the DB has no config row yet for a given variant — same
 * split as shipCosts.ts/getCurrentCosts.ts (pure/client-safe defaults
 * here, prisma read in getShipAttributeTables.ts).
 *
 * Specials aren't included here — they affect ship cost and their own
 * range/strength/movement (see specialConfigWeb2.ts), not this table's
 * gun/armor/shield combat stats.
 */
export const DEFAULT_ATTRIBUTE_TABLES_VERSION = 1;

export interface GunStats {
  range: number;
  damage: number;
  movement: number;
}

export interface DefenseStats {
  damageReduction: number;
  movement: number;
}

export interface ShipAttributeTables {
  version: number;
  baseHull: number;
  baseSpeed: number;
  /** Fore-accuracy range bonus (%) by accuracy trait index. */
  foreAccuracy: number[];
  /** Flat hull bonus by hull trait index. */
  hullBonus: number[];
  /** Movement modifier by speed trait index. */
  engineSpeeds: number[];
  /** By mainWeapon equipment index: variant 1 laser/railgun/missile/plasma, variant 2's own reskins. */
  guns: GunStats[];
  /** By armor equipment index: none, light, medium, heavy. */
  armors: DefenseStats[];
  /** By shields equipment index: none, light, medium, heavy. */
  shields: DefenseStats[];
  /** Kills needed for ranks 2-6 (length 5, strictly ascending, first > 0). */
  rankThresholds: number[];
  /** Stat bonus % for ranks 1-6 (length 6, each ≤ 100). */
  rankBonusPct: number[];
}

const SHARED_RANK_DEFAULTS = {
  rankThresholds: [10, 30, 100, 300, 1000],
  rankBonusPct: [0, 10, 20, 30, 40, 50],
};

export const DEFAULT_ATTRIBUTE_TABLES_V1: ShipAttributeTables = {
  version: DEFAULT_ATTRIBUTE_TABLES_VERSION,
  baseHull: 100,
  baseSpeed: 4,
  foreAccuracy: [0, 25, 50],
  hullBonus: [0, 10, 20],
  engineSpeeds: [0, 1, 2],
  guns: [
    { range: 3, damage: 50, movement: 0 }, // Laser
    { range: 6, damage: 40, movement: 0 }, // Railgun
    { range: 4, damage: 60, movement: -1 }, // MissileLauncher
    { range: 2, damage: 80, movement: 0 }, // PlasmaCannon
  ],
  armors: [
    { damageReduction: 0, movement: 1 }, // None (the once-only no-gear bonus)
    { damageReduction: 15, movement: 0 }, // Light
    { damageReduction: 30, movement: -1 }, // Medium
    { damageReduction: 45, movement: -2 }, // Heavy
  ],
  shields: [
    { damageReduction: 0, movement: 0 }, // None (movement never read — see armors.None)
    { damageReduction: 15, movement: 1 }, // Light
    { damageReduction: 30, movement: 0 }, // Medium
    { damageReduction: 45, movement: -1 }, // Heavy
  ],
  ...SHARED_RANK_DEFAULTS,
};

export const DEFAULT_ATTRIBUTE_TABLES_V2: ShipAttributeTables = {
  version: DEFAULT_ATTRIBUTE_TABLES_VERSION,
  baseHull: 125,
  baseSpeed: 3,
  foreAccuracy: [0, 25, 50],
  hullBonus: [0, 12, 25],
  engineSpeeds: [0, 1, 2],
  guns: [
    { range: 2, damage: 60, movement: 0 }, // Medium Mining Laser
    { range: 5, damage: 50, movement: 0 }, // Linear Accelerator
    { range: 3, damage: 70, movement: -1 }, // Torpedo Launcher
    { range: 1, damage: 95, movement: 0 }, // Mining Drill — adjacent-only, deliberate
  ],
  armors: [
    { damageReduction: 0, movement: 1 }, // None (unchanged; the once-only no-gear bonus)
    { damageReduction: 20, movement: 0 }, // Light
    { damageReduction: 40, movement: -1 }, // Medium
    { damageReduction: 60, movement: -3 }, // Heavy
  ],
  shields: [
    { damageReduction: 0, movement: 0 }, // None (movement never read — see armors.None)
    { damageReduction: 20, movement: 0 }, // Light
    { damageReduction: 40, movement: -1 }, // Medium
    { damageReduction: 60, movement: -2 }, // Heavy
  ],
  ...SHARED_RANK_DEFAULTS,
};

export const DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT: Record<number, ShipAttributeTables> = {
  1: DEFAULT_ATTRIBUTE_TABLES_V1,
  2: DEFAULT_ATTRIBUTE_TABLES_V2,
};

export function defaultAttributeTablesForVariant(variant: number): ShipAttributeTables {
  return DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT[variant] ?? DEFAULT_ATTRIBUTE_TABLES_V1;
}

// Back-compat alias for any lingering variant-1-only call sites.
export const DEFAULT_ATTRIBUTE_TABLES = DEFAULT_ATTRIBUTE_TABLES_V1;
