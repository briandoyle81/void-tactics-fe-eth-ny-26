import type { Address } from "viem";
import type {
  Ship,
  ShipColors,
  ShipData,
  ShipEquipment,
  ShipTraits,
} from "../types/types";

/**
 * Matches `ShipAttributes.setCosts` for variant 1 (ignition/modules/DeployAndConfig.ts).
 * Costs are identical between variant 1 and 2 except the special-slot
 * column (see docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
 * §2) — only `COST_SPECIAL` is branched by variant below. Slots 4-7 are the
 * inert `future*` filler equipment can never actually select.
 */
const COST_BASE = 50;
const COST_ACCURACY = [0, 10, 25];
const COST_HULL = [0, 10, 25];
const COST_SPEED = [0, 10, 25];
const COST_MAIN_WEAPON = [25, 30, 40, 40, 25, 25, 25, 25];
const COST_ARMOR = [0, 5, 10, 15, 0, 0, 0, 0];
const COST_SHIELDS = [0, 10, 20, 30, 0, 0, 0, 0];
const COST_SPECIAL_V1 = [0, 10, 20, 15, 0, 0, 0, 0];
const COST_SPECIAL_V2 = [0, 15, 20, 10, 0, 0, 0, 0];

/**
 * Threat points for UI (same formula as `ShipAttributes.calculateShipCost` onchain).
 * `variant` defaults to 1 for callers that only have a bare equipment/traits
 * pair in scope (matches getMainWeaponName's own default-variant convention).
 */
export function calculateTutorialThreatPoints(
  equipment: ShipEquipment,
  traits: Pick<ShipTraits, "accuracy" | "hull" | "speed">,
  variant: number = 1,
): number {
  const costSpecial = variant === 2 ? COST_SPECIAL_V2 : COST_SPECIAL_V1;
  return (
    COST_BASE +
    COST_ACCURACY[traits.accuracy] +
    COST_HULL[traits.hull] +
    COST_SPEED[traits.speed] +
    COST_MAIN_WEAPON[equipment.mainWeapon] +
    COST_ARMOR[equipment.armor] +
    COST_SHIELDS[equipment.shields] +
    costSpecial[equipment.special]
  );
}

export type TutorialShipVisual = {
  serialNumber: bigint;
  colors: ShipColors;
  variant: number;
};

export type TutorialCombatTraits = Pick<
  ShipTraits,
  "accuracy" | "hull" | "speed"
>;

function assertContractTraitTiers(
  name: string,
  traits: TutorialCombatTraits,
): void {
  for (const key of ["accuracy", "hull", "speed"] as const) {
    const v = traits[key];
    if (v < 0 || v > 2 || !Number.isInteger(v)) {
      throw new Error(
        `${name}: traits.${key} must be an integer 0–2 (contract enum index).`,
      );
    }
  }
}

/**
 * Build a tutorial `Ship`. **Canon:** `equipment` and `traits` (accuracy, hull,
 * speed as 0–2) match the onchain `Ship` shape. Combat attributes are always
 * `calculateAttributesFromContracts(ship)` elsewhere (e.g. tutorial game state),
 * same math as `ShipAttributes.calculateShipAttributes`.
 */
export function buildTutorialShip(input: {
  name: string;
  id: bigint;
  owner: Address;
  equipment: ShipEquipment;
  shipData: ShipData;
  traits: TutorialCombatTraits;
  visual: TutorialShipVisual;
}): Ship {
  const { visual, traits, ...rest } = input;
  if (rest.equipment.armor > 0 && rest.equipment.shields > 0) {
    throw new Error(
      `${rest.name}: armor and shields cannot both be non-zero (onchain / ShipConstructor rule).`,
    );
  }
  assertContractTraitTiers(rest.name, traits);
  const threat = calculateTutorialThreatPoints(rest.equipment, traits, visual.variant);

  return {
    name: rest.name,
    id: rest.id,
    equipment: rest.equipment,
    traits: {
      serialNumber: visual.serialNumber,
      colors: visual.colors,
      variant: visual.variant,
      accuracy: traits.accuracy,
      hull: traits.hull,
      speed: traits.speed,
    },
    shipData: {
      ...rest.shipData,
      cost: threat,
    },
    owner: rest.owner,
  };
}
