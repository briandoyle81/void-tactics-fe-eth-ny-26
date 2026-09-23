import { Attributes } from "../types/types";
import { Web2Ship } from "../types/web2Ship";
import {
  DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
  defaultAttributeTablesForVariant,
  type ShipAttributeTables,
} from "../lib/shipAttributeTables";
import { getSpecialConfigWeb2 } from "./specialConfigWeb2";

// Web2-mode counterpart to `shipAttributesCalculator.ts` — identical logic,
// parameterized over `Web2Ship` instead of the web3 `Ship` type so the two
// modes never need to share a type. See app/types/web2Ship.ts for why.
//
// The gun/armor/shield/hull/speed/rank tables are DB-backed and
// admin-editable, per variant, via the Ship Attributes admin panel's
// per-variant picker (see app/lib/shipAttributeTables.ts /
// getShipAttributeTables.ts / ShipAttributesWeb2.tsx). Callers fetch both
// variants' tables (getShipAttributeTablesByVariant()) and pass the whole
// map in — the ship's OWN traits.variant picks which one applies, right
// here, so a caller processing a mixed-variant batch never needs to sort
// ships by variant itself. DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT is only a
// fallback for callers that don't fetch live tables.

// rankThresholds[i] is the kill count needed for rank i+2 (rank 1 has no
// threshold — everyone starts there); rankBonusPct[rank-1] is that rank's
// stat bonus %. Both are per-variant table data now (previously hardcoded
// constants identical for every ship).
function getRankFromKills(tables: ShipAttributeTables, shipsDestroyed: number): number {
  let rank = 1;
  for (let i = 0; i < tables.rankThresholds.length; i++) {
    if (shipsDestroyed >= tables.rankThresholds[i]!) rank = i + 2;
  }
  return rank;
}

function getRankMultiplier(tables: ShipAttributeTables, rank: number): number {
  return tables.rankBonusPct[rank - 1] ?? 0;
}

function tablesForShip(
  ship: Web2Ship,
  tablesByVariant: Record<number, ShipAttributeTables>,
): ShipAttributeTables {
  return (
    tablesByVariant[ship.traits.variant] ??
    tablesByVariant[1] ??
    defaultAttributeTablesForVariant(ship.traits.variant)
  );
}

// Pure helpers mirroring onchain _calculateHullPoints / _calculateMovement / _calculateDamageReduction
function calcBaseHullPoints(ship: Web2Ship, tables: ShipAttributeTables): number {
  const traitIdx = Math.max(
    0,
    Math.min(tables.hullBonus.length - 1, ship.traits.hull),
  );
  const traitBonus = tables.hullBonus[traitIdx] ?? 0;
  return tables.baseHull + traitBonus;
}

function calcBaseMovement(ship: Web2Ship, tables: ShipAttributeTables): number {
  const speedIdx = Math.max(
    0,
    Math.min(tables.engineSpeeds.length - 1, ship.traits.speed),
  );

  const gun = tables.guns[ship.equipment.mainWeapon] ?? tables.guns[0]!;
  const special = getSpecialConfigWeb2(ship.traits.variant, ship.equipment.special);

  // Defensive gear's movement: a piece only counts when actually equipped.
  // The tables' "None" entries (index 0) are the once-only no-gear bonus,
  // counted ONCE — a ship carries armor OR shields, so one slot is always
  // None, and summing both tables' None entries would hand every ship a
  // free bonus (and a bare ship a doubled one). Only when the ship carries
  // neither does the None bonus apply, taken from the armor table (the
  // shields table's None movement is never read). Mirrors
  // ShipAttributes._calculateMovement / shipAttributesCalculator.ts exactly.
  const armorIsNone = ship.equipment.armor === 0;
  const shieldsAreNone = ship.equipment.shields === 0;
  let armorMovement = 0;
  let shieldMovement = 0;
  if (!armorIsNone) {
    armorMovement = (tables.armors[ship.equipment.armor] ?? tables.armors[0]!).movement;
  }
  if (!shieldsAreNone) {
    shieldMovement = (tables.shields[ship.equipment.shields] ?? tables.shields[0]!).movement;
  }
  if (armorIsNone && shieldsAreNone) {
    armorMovement = tables.armors[0]!.movement;
  }

  let baseMovement = tables.baseSpeed;
  baseMovement += tables.engineSpeeds[speedIdx] ?? 0;
  baseMovement += gun.movement;
  baseMovement += armorMovement;
  baseMovement += shieldMovement;
  // Specials can also modify movement — variant 1's specials all have 0
  // movement, but variant 2's Additional Thruster (slot 3) is a pure
  // passive +3, always in effect while equipped (see specialConfigWeb2.ts).
  baseMovement += special?.movement ?? 0;

  return baseMovement;
}

function calcBaseDamageReduction(ship: Web2Ship, tables: ShipAttributeTables): number {
  const armor = tables.armors[ship.equipment.armor] ?? tables.armors[0]!;
  const shield = tables.shields[ship.equipment.shields] ?? tables.shields[0]!;
  return armor.damageReduction + shield.damageReduction;
}

// Attribute calculation for a ship based directly on the ShipAttributes
// contract tables (guns/armors/shields), including the same rank and
// fore-accuracy scaling the on-chain contract applies:
// - Base values from the ship's own variant's Gun/Armor/Shield tables
// - Rank multiplier applied as a percentage to range, damage, hull,
//   movement, and damageReduction
// - Fore accuracy bonus applied as a percentage to range only
// - Final range and movement are floored at 1; damageReduction capped at 100
//
// Mirrors `calculateAttributesFromContracts` in `shipAttributesCalculator.ts`.
export function calculateAttributesFromContractsWeb2(
  ship: Web2Ship,
  tablesByVariant: Record<number, ShipAttributeTables> = DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
): Attributes {
  const tables = tablesForShip(ship, tablesByVariant);
  const gun = tables.guns[ship.equipment.mainWeapon] ?? tables.guns[0]!;

  const baseRange = gun.range;
  const baseGunDamage = gun.damage;
  const baseHullPoints = calcBaseHullPoints(ship, tables);
  const baseMovement = calcBaseMovement(ship, tables);
  const baseDamageReduction = calcBaseDamageReduction(ship, tables);

  // Rank-based bonuses (same thresholds/multipliers as the contract, per this ship's own variant)
  const rank = getRankFromKills(tables, ship.shipData.shipsDestroyed ?? 0);
  const rankMultiplier = getRankMultiplier(tables, rank);

  const applyPercentBonus = (value: number, percent: number): number =>
    value + Math.floor((value * percent) / 100);

  const rangeWithRank = applyPercentBonus(baseRange, rankMultiplier);
  const gunDamageWithRank = applyPercentBonus(baseGunDamage, rankMultiplier);
  const hullWithRank = applyPercentBonus(baseHullPoints, rankMultiplier);
  const movementWithRank = applyPercentBonus(baseMovement, rankMultiplier);
  const drWithRank = applyPercentBonus(baseDamageReduction, rankMultiplier);

  // Fore accuracy bonus applies an additional percentage bonus to range
  const accIdx = Math.max(
    0,
    Math.min(tables.foreAccuracy.length - 1, ship.traits.accuracy),
  );
  const foreBonus = tables.foreAccuracy[accIdx] ?? 0;
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
