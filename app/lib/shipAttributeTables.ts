/**
 * Ship attribute stat tables — mirrors the ShipAttributes contract's
 * gun/armor/shield/hull/speed/accuracy tables (v1). The authoritative
 * values are stored in the DB Config table (key: "ship_attribute_tables")
 * and managed via the (web2) Ship Attributes admin panel. These are the
 * fallback defaults when the DB has no config row yet — same split as
 * shipCosts.ts/getCurrentCosts.ts (pure/client-safe defaults here, prisma
 * read in getShipAttributeTables.ts).
 *
 * Specials aren't included — v1 specials only affect ship cost (ship_costs
 * Config), not combat attributes (see shipAttributesCalculatorWeb2.ts).
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
  /** By mainWeapon equipment index: laser, railgun, missile, plasma. */
  guns: GunStats[];
  /** By armor equipment index: none, light, medium, heavy. */
  armors: DefenseStats[];
  /** By shields equipment index: none, light, medium, heavy. */
  shields: DefenseStats[];
}

export const DEFAULT_ATTRIBUTE_TABLES: ShipAttributeTables = {
  version: DEFAULT_ATTRIBUTE_TABLES_VERSION,
  baseHull: 100,
  baseSpeed: 3,
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
    { damageReduction: 0, movement: 1 }, // None
    { damageReduction: 15, movement: 0 }, // Light
    { damageReduction: 30, movement: -1 }, // Medium
    { damageReduction: 45, movement: -2 }, // Heavy
  ],
  shields: [
    { damageReduction: 0, movement: 1 }, // None
    { damageReduction: 15, movement: 1 }, // Light
    { damageReduction: 30, movement: 0 }, // Medium
    { damageReduction: 45, movement: -1 }, // Heavy
  ],
};
