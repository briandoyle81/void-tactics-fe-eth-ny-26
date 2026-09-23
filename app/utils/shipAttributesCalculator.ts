import { Attributes, Ship } from "../types/types";
import { getRankConfig } from "./rankConfigCache";

// ShipAttributes constants — mirrors the tables published on-chain by
// ignition/modules/DeployAndConfig.ts's setVariantAttributes calls
// (docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
// §1/§4). Attributes are versioned per variant now, and both variants'
// tables live here since previews need them synchronously (no hook/contract
// round trip). This mirrors *today's* published tables — if an admin
// republishes a variant's attributes via the ShipAttributes editor with
// different numbers, this preview goes stale until updated to match. The
// authoritative source for an owned ship's actual stats is always the
// contract's `calculateShipAttributesByIds`; this is preview/tutorial-only.

interface GunEntry {
  range: number;
  damage: number;
  movement: number;
}
interface ArmorOrShieldEntry {
  damageReduction: number;
  movement: number;
}
interface SpecialEntry {
  range: number;
  strength: number;
  movement: number;
}

interface VariantAttributeTable {
  baseHull: number;
  baseSpeed: number;
  foreAccuracy: number[];
  hullBonus: number[];
  engineSpeeds: number[];
  guns: GunEntry[];
  armors: ArmorOrShieldEntry[];
  shields: ArmorOrShieldEntry[];
  specials: SpecialEntry[];
  rankThresholds: number[];
  rankBonusPct: number[];
}

// Slots 4-7 (guns/armors/shields) and Slot4-7 (specials) are inert `future*`
// filler on both variants — zero stats, never equippable.
const INERT_GUN: GunEntry = { range: 0, damage: 0, movement: 0 };
const INERT_ARMOR_OR_SHIELD: ArmorOrShieldEntry = { damageReduction: 0, movement: 0 };
const INERT_SPECIAL: SpecialEntry = { range: 0, strength: 0, movement: 0 };

const VARIANT_1_TABLE: VariantAttributeTable = {
  baseHull: 100,
  baseSpeed: 4,
  foreAccuracy: [0, 25, 50],
  hullBonus: [0, 10, 20],
  engineSpeeds: [0, 1, 2],
  guns: [
    { range: 3, damage: 50, movement: 0 }, // Generic (Laser)
    { range: 6, damage: 40, movement: 0 }, // Sniper (Railgun)
    { range: 4, damage: 60, movement: -1 }, // Missile (Missile Launcher)
    { range: 2, damage: 80, movement: 0 }, // Close (Plasma Cannon)
    INERT_GUN,
    INERT_GUN,
    INERT_GUN,
    INERT_GUN,
  ],
  armors: [
    { damageReduction: 0, movement: 1 }, // None (the once-only no-gear bonus)
    { damageReduction: 15, movement: 0 }, // Light
    { damageReduction: 30, movement: -1 }, // Medium
    { damageReduction: 45, movement: -2 }, // Heavy
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
  ],
  shields: [
    { damageReduction: 0, movement: 0 }, // None (movement never read — see armors.None)
    { damageReduction: 15, movement: 1 }, // Light
    { damageReduction: 30, movement: 0 }, // Medium
    { damageReduction: 45, movement: -1 }, // Heavy
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
  ],
  specials: [
    INERT_SPECIAL, // None
    { range: 1, strength: 1, movement: 0 }, // Slot1: EMP
    { range: 3, strength: 40, movement: 0 }, // Slot2: Repair Drones
    { range: 3, strength: 30, movement: 0 }, // Slot3: Flak Array
    INERT_SPECIAL,
    INERT_SPECIAL,
    INERT_SPECIAL,
    INERT_SPECIAL,
  ],
  rankThresholds: [10, 30, 100, 300, 1000],
  rankBonusPct: [0, 10, 20, 30, 40, 50],
};

const VARIANT_2_TABLE: VariantAttributeTable = {
  baseHull: 125,
  baseSpeed: 3,
  foreAccuracy: [0, 25, 50],
  hullBonus: [0, 12, 25],
  engineSpeeds: [0, 1, 2],
  guns: [
    { range: 2, damage: 60, movement: 0 }, // Generic (Medium Mining Laser)
    { range: 5, damage: 50, movement: 0 }, // Sniper (Linear Accelerator)
    { range: 3, damage: 70, movement: -1 }, // Missile (Torpedo Launcher)
    { range: 1, damage: 95, movement: 0 }, // Close (Mining Drill) — adjacent-only, deliberate
    INERT_GUN,
    INERT_GUN,
    INERT_GUN,
    INERT_GUN,
  ],
  armors: [
    { damageReduction: 0, movement: 1 }, // None (unchanged; the once-only no-gear bonus)
    { damageReduction: 20, movement: 0 }, // Light
    { damageReduction: 40, movement: -1 }, // Medium
    { damageReduction: 60, movement: -3 }, // Heavy
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
  ],
  shields: [
    { damageReduction: 0, movement: 0 }, // None (movement never read — see armors.None)
    { damageReduction: 20, movement: 0 }, // Light
    { damageReduction: 40, movement: -1 }, // Medium
    { damageReduction: 60, movement: -2 }, // Heavy
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
    INERT_ARMOR_OR_SHIELD,
  ],
  specials: [
    INERT_SPECIAL, // None
    { range: 2, strength: 1, movement: 0 }, // Slot1: Electric Storm
    { range: 5, strength: 40, movement: 0 }, // Slot2: Drone Swarm
    { range: 0, strength: 0, movement: 3 }, // Slot3: Additional Thruster (passive movement)
    INERT_SPECIAL,
    INERT_SPECIAL,
    INERT_SPECIAL,
    INERT_SPECIAL,
  ],
  rankThresholds: [10, 30, 100, 300, 1000],
  rankBonusPct: [0, 10, 20, 30, 40, 50],
};

function tableForVariant(variant: number): VariantAttributeTable {
  return variant === 2 ? VARIANT_2_TABLE : VARIANT_1_TABLE;
}

// Rank thresholds/bonuses come from the live rankConfigCache (see
// rankConfigCache.ts), not this table's own rankThresholds/rankBonusPct
// fields — those remain only as the cache's pre-hydration fallback shape
// and are never read directly here. Unlike the rest of this table (guns/
// armor/specials, deliberately preview-only per the file header comment),
// rank config is cheap to keep live since useRankConfigSync already fetches
// it for the ship-card/rank-badge display layer.
function getRankFromKills(variant: number, shipsDestroyed: number): number {
  const { thresholds } = getRankConfig(variant);
  // thresholds[i] is the kill count needed for rank i+2 (rank 1 has no
  // threshold — everyone starts there).
  let rank = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (shipsDestroyed >= thresholds[i]) {
      rank = i + 2;
    }
  }
  return rank;
}

function getRankMultiplier(variant: number, rank: number): number {
  return getRankConfig(variant).bonusPct[rank - 1] ?? 0;
}

// Pure helpers mirroring onchain _calculateHullPoints / _calculateMovement / _calculateDamageReduction
function calcBaseHullPoints(ship: Ship, table: VariantAttributeTable): number {
  const traitIdx = Math.max(0, Math.min(table.hullBonus.length - 1, ship.traits.hull));
  const traitBonus = table.hullBonus[traitIdx] ?? 0;
  return table.baseHull + traitBonus;
}

function calcBaseMovement(ship: Ship, table: VariantAttributeTable): number {
  const speedIdx = Math.max(0, Math.min(table.engineSpeeds.length - 1, ship.traits.speed));

  const gun = table.guns[ship.equipment.mainWeapon] ?? table.guns[0];
  const special = table.specials[ship.equipment.special] ?? table.specials[0];

  // Defensive gear's movement: a piece only counts when actually equipped.
  // The tables' "None" entries (index 0) are the once-only no-gear bonus,
  // and it's counted ONCE — a ship carries armor OR shields, so one slot is
  // always None, and summing both tables' None entries would hand every
  // ship a free bonus (and a bare ship a doubled one). Only when the ship
  // carries neither does the None bonus apply, taken from the armor table
  // (the shields table's None movement is never read). Mirrors
  // ShipAttributes._calculateMovement exactly.
  const armorIsNone = ship.equipment.armor === 0;
  const shieldsAreNone = ship.equipment.shields === 0;
  let armorMovement = 0;
  let shieldMovement = 0;
  if (!armorIsNone) {
    armorMovement = (table.armors[ship.equipment.armor] ?? table.armors[0]).movement;
  }
  if (!shieldsAreNone) {
    shieldMovement = (table.shields[ship.equipment.shields] ?? table.shields[0]).movement;
  }
  if (armorIsNone && shieldsAreNone) {
    armorMovement = table.armors[0].movement;
  }

  let baseMovement = table.baseSpeed;
  baseMovement += table.engineSpeeds[speedIdx] ?? 0;

  baseMovement += gun.movement;
  baseMovement += armorMovement;
  baseMovement += shieldMovement;
  baseMovement += special.movement; // e.g. variant 2's Additional Thruster

  return baseMovement;
}

function calcBaseDamageReduction(ship: Ship, table: VariantAttributeTable): number {
  const armor = table.armors[ship.equipment.armor] ?? table.armors[0];
  const shield = table.shields[ship.equipment.shields] ?? table.shields[0];
  return armor.damageReduction + shield.damageReduction;
}

// Attribute calculation for a ship based directly on the ShipAttributes
// contract tables (guns/armors/shields), including the same rank and
// fore-accuracy scaling the on-chain contract applies:
// - Base values from the ship's own variant's Gun/Armor/Shield/Special tables
// - Rank multiplier applied as a percentage to range, damage, hull,
//   movement, and damageReduction
// - Fore accuracy bonus applied as a percentage to range only
// - Final range and movement are floored at 1 (table entries can still be 0
//   or negative; only the computed total is raised)
//
// This mirrors the Solidity implementation in ShipAttributes.calculateShipAttributes.
export function calculateAttributesFromContracts(ship: Ship): Attributes {
  const table = tableForVariant(ship.traits.variant);
  const gun = table.guns[ship.equipment.mainWeapon] ?? table.guns[0];

  const baseRange = gun.range;
  const baseGunDamage = gun.damage;
  const baseHullPoints = calcBaseHullPoints(ship, table);
  const baseMovement = calcBaseMovement(ship, table);
  const baseDamageReduction = calcBaseDamageReduction(ship, table);

  // Rank-based bonuses (live per-variant thresholds/multipliers)
  const rank = getRankFromKills(ship.traits.variant, Number(ship.shipData.shipsDestroyed ?? 0n));
  const rankMultiplier = getRankMultiplier(ship.traits.variant, rank);

  const applyPercentBonus = (value: number, percent: number): number =>
    value + Math.floor((value * percent) / 100);

  const rangeWithRank = applyPercentBonus(baseRange, rankMultiplier);
  const gunDamageWithRank = applyPercentBonus(baseGunDamage, rankMultiplier);
  const hullWithRank = applyPercentBonus(baseHullPoints, rankMultiplier);
  const movementWithRank = applyPercentBonus(baseMovement, rankMultiplier);
  const drWithRank = applyPercentBonus(baseDamageReduction, rankMultiplier);

  // Fore accuracy bonus applies an additional percentage bonus to range
  const accIdx = Math.max(0, Math.min(table.foreAccuracy.length - 1, ship.traits.accuracy));
  const foreBonus = table.foreAccuracy[accIdx] ?? 0;
  const rangeWithFore = applyPercentBonus(rangeWithRank, foreBonus);

  const hullPoints = hullWithRank;
  const maxHullPoints = hullWithRank;

  return {
    version: 1,
    range: Math.max(1, rangeWithFore),
    gunDamage: gunDamageWithRank,
    hullPoints,
    maxHullPoints,
    movement: Math.max(1, movementWithRank),
    // Capped at 100% (matches the contract — every damage-reduction
    // consumer computes `baseDamage - (baseDamage * reduction) / 100`,
    // which underflows past 100).
    damageReduction: Math.min(100, drWithRank),
    reactorCriticalTimer: 0,
    statusEffects: [],
  };
}
