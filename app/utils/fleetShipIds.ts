/** Fleets.createFleet reverts DuplicateShipId if the same id appears twice. */
export function hasDuplicateShipIds(
  ids: readonly (bigint | number | string)[],
): boolean {
  const seen = new Set<string>();
  for (const id of ids) {
    const key = String(id);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export const DUPLICATE_SHIP_ID_TOAST =
  "The same ship can't appear twice in one fleet.";
