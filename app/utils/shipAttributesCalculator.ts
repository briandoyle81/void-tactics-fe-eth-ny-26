import { Attributes, Ship } from "../types/types";

// ShipAttributes v1 constants (mirroring onchain ShipAttributes module)

const ATTR_BASE_HULL = 100;
const ATTR_BASE_SPEED = 3;

// Fore accuracy bonuses (%) - applied as a percentage increase to range
const ATTR_FORE_ACCURACY: number[] = [0, 25, 50];

// Hull bonuses (flat hull points)
const ATTR_HULL_BONUS: number[] = [0, 10, 20];

// Engine speed bonuses (movement modifier)
const ATTR_ENGINE_SPEEDS: number[] = [0, 1, 2];

// Gun data: [range, damage, movement]
const ATTR_GUNS: Array<{ range: number; damage: number; movement: number }> = [
  { range: 3, damage: 50, movement: 0 }, // Laser
  { range: 6, damage: 40, movement: 0 }, // Railgun
  { range: 4, damage: 60, movement: -1 }, // MissileLauncher
  { range: 2, damage: 80, movement: 0 }, // PlasmaCannon
];

// Armor data: [damageReduction, movement]
const ATTR_ARMORS: Array<{ damageReduction: number; movement: number }> = [
  { damageReduction: 0, movement: 1 }, // None
  { damageReduction: 15, movement: 0 }, // Light
  { damageReduction: 30, movement: -1 }, // Medium
  { damageReduction: 45, movement: -2 }, // Heavy
];

// Shield data: [damageReduction, movement]
const ATTR_SHIELDS: Array<{ damageReduction: number; movement: number }> = [
  { damageReduction: 0, movement: 1 }, // None
  { damageReduction: 15, movement: 1 }, // Light
  { damageReduction: 30, movement: 0 }, // Medium
  { damageReduction: 45, movement: -1 }, // Heavy
];

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
function calcBaseHullPoints(ship: Ship): number {
  const traitIdx = Math.max(
    0,
    Math.min(ATTR_HULL_BONUS.length - 1, ship.traits.hull),
  );
  const traitBonus = ATTR_HULL_BONUS[traitIdx] ?? 0;
  return ATTR_BASE_HULL + traitBonus;
}

function calcBaseMovement(ship: Ship): number {
  const speedIdx = Math.max(
    0,
    Math.min(ATTR_ENGINE_SPEEDS.length - 1, ship.traits.speed),
  );

  const gun = ATTR_GUNS[ship.equipment.mainWeapon] ?? ATTR_GUNS[0];
  const armor = ATTR_ARMORS[ship.equipment.armor] ?? ATTR_ARMORS[0];
  const shield = ATTR_SHIELDS[ship.equipment.shields] ?? ATTR_SHIELDS[0];

  let baseMovement = ATTR_BASE_SPEED;
  baseMovement += ATTR_ENGINE_SPEEDS[speedIdx] ?? 0;

  baseMovement += gun.movement;
  baseMovement += armor.movement;
  baseMovement += shield.movement;

  // Specials can also modify movement onchain; current v1 specials all have 0 movement.
  return Math.max(0, baseMovement);
}

function calcBaseDamageReduction(ship: Ship): number {
  const armor = ATTR_ARMORS[ship.equipment.armor] ?? ATTR_ARMORS[0];
  const shield = ATTR_SHIELDS[ship.equipment.shields] ?? ATTR_SHIELDS[0];
  return armor.damageReduction + shield.damageReduction;
}

// Attribute calculation for a ship based directly on the ShipAttributes
// contract tables (guns/armors/shields) including the same rank and
// fore-accuracy scaling that the onchain contract applies:
// - Base values from the Gun/Armor/Shield tables
// - Rank multiplier applied as a percentage to range, damage, hull,
//   movement, and damageReduction
// - Fore accuracy bonus applied as a percentage to range only
//
// This mirrors the Solidity implementation in ShipAttributes.calculateShipAttributes.
export function calculateAttributesFromContracts(ship: Ship): Attributes {
  const gun = ATTR_GUNS[ship.equipment.mainWeapon] ?? ATTR_GUNS[0];

  const baseRange = gun.range;
  const baseGunDamage = gun.damage;
  const baseHullPoints = calcBaseHullPoints(ship);
  const baseMovement = calcBaseMovement(ship);
  const baseDamageReduction = calcBaseDamageReduction(ship);

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
    Math.min(ATTR_FORE_ACCURACY.length - 1, ship.traits.accuracy),
  );
  const foreBonus = ATTR_FORE_ACCURACY[accIdx] ?? 0;
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

