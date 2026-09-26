/**
 * Combat/stat values on a ship must come from that ship (or its attributes
 * table). Never substitute a hardcoded default when the value is missing
 * or unreadable.
 */
export function requireShipValue(name: string, value: unknown): number {
  const n = readShipValue(name, value);
  if (n === undefined) {
    throw new Error(`Missing ship value: ${name}`);
  }
  return n;
}

/** Missing/unloaded → undefined. Present but unreadable → throw. */
export function readShipValue(name: string, value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid ship value ${name}: ${String(value)}`);
  }
  return n;
}

export function resolveActionRange(params: {
  selectedWeaponType: "weapon" | "special" | "ram";
  specialRange?: unknown;
  factionAbilityRange?: unknown;
  gunRange?: unknown;
}): number | undefined {
  const { selectedWeaponType, specialRange, factionAbilityRange, gunRange } = params;
  if (selectedWeaponType === "special") {
    return readShipValue("specialRange", specialRange);
  }
  if (selectedWeaponType === "ram") {
    return readShipValue("factionAbilityRange", factionAbilityRange);
  }
  return readShipValue("range", gunRange);
}
