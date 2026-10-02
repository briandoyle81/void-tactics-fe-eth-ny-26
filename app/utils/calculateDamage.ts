import { Attributes } from "../types/types";
import { isAttackDronesSpecial, isRepairDronesSpecial } from "./specialConfigWeb2";

export interface SpecialLike {
  strength: number;
}

export interface DamageResult {
  baseDamage: number;
  reducedDamage: number;
  willKill: boolean;
  reactorCritical: boolean;
}

export function calculateDamage({
  shooterId,
  targetShipId,
  getShipAttributes,
  selectedWeaponType,
  specialData,
  specialType,
  shipVariant = 1,
  weaponType,
  showReducedDamage,
}: {
  shooterId: bigint | null;
  targetShipId: bigint;
  getShipAttributes: (id: bigint) => Attributes | null;
  selectedWeaponType: "weapon" | "special";
  specialData: SpecialLike | null | undefined;
  specialType: number;
  shipVariant?: number;
  weaponType?: "weapon" | "special";
  showReducedDamage?: boolean;
}): DamageResult {
  const empty: DamageResult = {
    baseDamage: 0,
    reducedDamage: 0,
    willKill: false,
    reactorCritical: false,
  };

  if (shooterId == null) return empty;

  const shooterAttributes = getShipAttributes(shooterId);
  const targetAttributes = getShipAttributes(targetShipId);
  if (!shooterAttributes || !targetAttributes) return empty;

  const currentWeaponType = weaponType ?? selectedWeaponType;

  // EMP: no HP damage, just reactor tick
  if (currentWeaponType === "special" && specialType === 1) {
    return { ...empty, reactorCritical: true };
  }

  // Repair Drones (variant 1 slot 2): heal amount, ignores DR
  if (
    currentWeaponType === "special" &&
    isRepairDronesSpecial(shipVariant, specialType)
  ) {
    const baseDamage =
      specialData?.strength ?? shooterAttributes.gunDamage;
    return { baseDamage, reducedDamage: baseDamage, willKill: false, reactorCritical: false };
  }

  // Shooting a 0-HP (disabled) ship triggers reactor critical
  if (targetAttributes.hullPoints === 0) {
    return { ...empty, reactorCritical: true };
  }

  const baseDamage =
    currentWeaponType === "special"
      ? (specialData?.strength ?? shooterAttributes.gunDamage)
      : shooterAttributes.gunDamage;

  const reduction = targetAttributes.damageReduction;
  const applyDamageReduction =
    currentWeaponType !== "special" ||
    showReducedDamage ||
    isAttackDronesSpecial(shipVariant, specialType);
  const reducedDamage = applyDamageReduction
    ? Math.max(0, baseDamage - Math.floor((baseDamage * reduction) / 100))
    : baseDamage;

  const willKill = reducedDamage >= targetAttributes.hullPoints;

  return { baseDamage, reducedDamage, willKill, reactorCritical: false };
}

/** Reactor stack reaching 3 is DESTROY (permanent), as opposed to SOS. */
export function wouldDestroy(
  damage: Pick<DamageResult, "reactorCritical">,
  attrs: { reactorCriticalTimer: number } | null,
): boolean {
  return !!attrs && damage.reactorCritical && attrs.reactorCriticalTimer + 1 >= 3;
}

/** Hull going to 0 is SOS (disabled). Reactor stack to 3 is DESTROY, not SOS. */
export function wouldEnterSos(
  damage: Pick<DamageResult, "willKill" | "reactorCritical">,
  attrs: { hullPoints: number; reactorCriticalTimer: number } | null,
): boolean {
  if (!attrs || attrs.hullPoints <= 0) return false;
  return damage.willKill && !wouldDestroy(damage, attrs);
}
