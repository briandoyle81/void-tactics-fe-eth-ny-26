import { Attributes } from "../types/types";
import { Web2Ship } from "../types/web2Ship";
import {
  DEFAULT_ATTRIBUTE_TABLES,
  type ShipAttributeTables,
} from "../lib/shipAttributeTables";

// Web2-mode counterpart to `shipAttributesCalculator.ts` — identical logic,
// parameterized over `Web2Ship` instead of the web3 `Ship` type so the two
// modes never need to share a type. See app/types/web2Ship.ts for why.
//
// The gun/armor/shield/hull/speed/accuracy tables are DB-backed and
// admin-editable (see app/lib/shipAttributeTables.ts / getShipAttributeTables.ts
// / ShipAttributesWeb2.tsx) — callers fetch the live tables and pass them in;
// DEFAULT_ATTRIBUTE_TABLES is only a fallback for callers that don't.

// Rank thresholds and multipliers (% bonuses)
function getRankFromKills(shipsDestroyed: number): number {
  if (shipsDestroyed >= 1000) return 6;
  if (shipsDestroyed >= 300) return 5;
  if (shipsDestroyed >= 100) return 4;
  if (shipsDestroyed >= 30) return 3;
  if (shipsDestroyed >= 10) return 2;
  return 1;
}

function getRankMultiplier(rank: number): number {
  if (rank >= 6) return 50;
  if (rank === 5) return 40;
  if (rank === 4) return 30;
  if (rank === 3) return 20;
  if (rank === 2) return 10;
  return 0; // rank 1
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

  const gun = tables.guns[ship.equipment.mainWeapon] ?? tables.guns[0];
  const armor = tables.armors[ship.equipment.armor] ?? tables.armors[0];
  const shield = tables.shields[ship.equipment.shields] ?? tables.shields[0];

  let baseMovement = tables.baseSpeed;
  baseMovement += tables.engineSpeeds[speedIdx] ?? 0;

  baseMovement += gun.movement;
  baseMovement += armor.movement;
  baseMovement += shield.movement;

  // Specials can also modify movement onchain; current v1 specials all have 0 movement.
  return Math.max(0, baseMovement);
}

function calcBaseDamageReduction(ship: Web2Ship, tables: ShipAttributeTables): number {
  const armor = tables.armors[ship.equipment.armor] ?? tables.armors[0];
  const shield = tables.shields[ship.equipment.shields] ?? tables.shields[0];
  return armor.damageReduction + shield.damageReduction;
}

// Attribute calculation for a ship based directly on the ShipAttributes
// contract tables (guns/armors/shields) including the same rank and
// fore-accuracy scaling that the onchain contract applies. Mirrors
// `calculateAttributesFromContracts` in `shipAttributesCalculator.ts`.
// `tables` is DB-backed/admin-editable (see getShipAttributeTables.ts);
// defaults to DEFAULT_ATTRIBUTE_TABLES for callers that don't fetch it.
export function calculateAttributesFromContractsWeb2(
  ship: Web2Ship,
  tables: ShipAttributeTables = DEFAULT_ATTRIBUTE_TABLES,
): Attributes {
  const gun = tables.guns[ship.equipment.mainWeapon] ?? tables.guns[0];

  const baseRange = gun.range;
  const baseGunDamage = gun.damage;
  const baseHullPoints = calcBaseHullPoints(ship, tables);
  const baseMovement = calcBaseMovement(ship, tables);
  const baseDamageReduction = calcBaseDamageReduction(ship, tables);

  // Rank-based bonuses (same thresholds/multipliers as contract)
  const rank = getRankFromKills(ship.shipData.shipsDestroyed ?? 0);
  const rankMultiplier = getRankMultiplier(rank);

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
    range: rangeWithFore,
    gunDamage: gunDamageWithRank,
    hullPoints,
    maxHullPoints,
    movement: movementWithRank,
    damageReduction: drWithRank,
    reactorCriticalTimer: 0,
    statusEffects: [],
  };
}
