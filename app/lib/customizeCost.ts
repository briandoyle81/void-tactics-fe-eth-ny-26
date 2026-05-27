import { PURCHASE_TIERS } from "./purchaseTiers";

export interface ShipEquipmentInput {
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
}

export interface ShipTraitsInput {
  accuracy: number;
  hull: number;
  speed: number;
}

// baseCost mirrors the contract: tierPrices(0) / 5 (integer division)
const BASE_COST_UTC = Math.floor((PURCHASE_TIERS[0]?.priceUtc ?? 499) / 5);

export function countNewModifications(
  current: { equipment: ShipEquipmentInput; traits: ShipTraitsInput; shiny: boolean },
  proposed: { equipment: ShipEquipmentInput; traits: ShipTraitsInput; shiny: boolean },
): number {
  let mods = 0;
  if (current.equipment.mainWeapon !== proposed.equipment.mainWeapon) mods++;
  if (current.equipment.armor !== proposed.equipment.armor) mods++;
  if (current.equipment.shields !== proposed.equipment.shields) mods++;
  if (current.equipment.special !== proposed.equipment.special) mods++;

  mods += Math.abs(proposed.traits.accuracy - current.traits.accuracy);
  mods += Math.abs(proposed.traits.hull - current.traits.hull);
  mods += Math.abs(proposed.traits.speed - current.traits.speed);

  if (current.shiny !== proposed.shiny) mods += 3;

  return mods;
}

export function calculateCustomizeCost(modifiedCount: number, newMods: number): number {
  const totalMods = modifiedCount + newMods;
  return BASE_COST_UTC * Math.pow(2, totalMods);
}

export function validateCustomization(
  equipment: ShipEquipmentInput,
  traits: ShipTraitsInput,
): string | null {
  if (!Number.isInteger(traits.accuracy) || traits.accuracy < 0 || traits.accuracy > 2) return "Accuracy must be 0, 1, or 2";
  if (!Number.isInteger(traits.hull) || traits.hull < 0 || traits.hull > 2) return "Hull must be 0, 1, or 2";
  if (!Number.isInteger(traits.speed) || traits.speed < 0 || traits.speed > 2) return "Speed must be 0, 1, or 2";
  if (!Number.isInteger(equipment.mainWeapon) || equipment.mainWeapon < 0 || equipment.mainWeapon > 3) return "mainWeapon must be 0–3";
  if (!Number.isInteger(equipment.armor) || equipment.armor < 0 || equipment.armor > 3) return "armor must be 0–3";
  if (!Number.isInteger(equipment.shields) || equipment.shields < 0 || equipment.shields > 3) return "shields must be 0–3";
  if (!Number.isInteger(equipment.special) || equipment.special < 0 || equipment.special > 3) return "special must be 0–3";
  if (equipment.armor > 0 && equipment.shields > 0) return "Cannot equip both armor and shields";
  return null;
}
