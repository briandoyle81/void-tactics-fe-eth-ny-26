// Stub: blockchain ship attributes local cache removed in REST backend migration.
import type { Attributes } from "../types/types";

export const SHIP_ATTRIBUTES_LOCAL_CACHE_MS = 365 * 24 * 60 * 60 * 1000;

export function shipIdsToCacheKeyString(shipIds: number[]): string {
  return shipIds.map((id) => id.toString()).join(",");
}

export function getCachedAttributesByIds(
  _chainId: number,
  _shipIdsCacheKey: string,
): Attributes[] | null {
  return null;
}

export function persistAttributesByIds(
  _chainId: number,
  _shipIds: string[],
  _attributes: Attributes[],
): void {}

export async function fetchAndPersistShipAttributesCaches(
  _publicClient: unknown,
  _params: { chainId: number; shipAttributesAddress: string; shipIds: number[] },
): Promise<void> {}

export function clearShipAttributesCaches(_chainId?: number): void {}
