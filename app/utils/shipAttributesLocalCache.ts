import type { Abi, PublicClient } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import type { Attributes } from "../types/types";

const SHIP_ATTRIBUTES_BY_IDS_CACHE_KEY_PREFIX =
  "ship-attributes-cache-v2" as const;

function shipAttributesByIdsCacheKey(chainId: number): string {
  return `${SHIP_ATTRIBUTES_BY_IDS_CACHE_KEY_PREFIX}:${chainId}`;
}

const CONTRACT_SNAPSHOT_KEY = (chainId: number) =>
  `warpflow-ship-attributes-contract-v1-${chainId}`;

/**
 * Long TTL; refreshed after successful ship cost sync and when the hook loads
 * fresh `calculateShipAttributesByIds` data from the chain.
 */
export const SHIP_ATTRIBUTES_LOCAL_CACHE_MS = 365 * 24 * 60 * 60 * 1000;

/** Order-sensitive; must match `useShipAttributesByIds` shipIds string. */
export function shipIdsToCacheKeyString(shipIds: number[]): string {
  return shipIds.map((id) => id.toString()).join(",");
}

interface CachedAttributesByIds {
  data: Attributes[];
  timestamp: number;
  shipIds: string[];
}

export type ShipAttributesContractSnapshotV1 = {
  timestamp: number;
  chainId: number;
  currentCostsVersion: string;
  currentAttributesVersion: string;
  /** `getCosts()` return; numbers stored as strings. */
  getCosts: unknown;
};

export function readValidShipAttributesByIdsCache(
  chainId: number,
  shipIdsString: string,
): Attributes[] | null {
  if (typeof window === "undefined") return null;
  try {
    const key = shipAttributesByIdsCacheKey(chainId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAttributesByIds;
    if (
      Date.now() - parsed.timestamp < SHIP_ATTRIBUTES_LOCAL_CACHE_MS &&
      parsed.shipIds.join(",") === shipIdsString
    ) {
      return parsed.data;
    }
    localStorage.removeItem(key);
    return null;
  } catch {
    localStorage.removeItem(shipAttributesByIdsCacheKey(chainId));
    return null;
  }
}

export function writeShipAttributesByIdsCache(
  chainId: number,
  shipIds: number[],
  data: Attributes[],
): void {
  if (typeof window === "undefined") return;
  try {
    const key = shipAttributesByIdsCacheKey(chainId);
    const payload: CachedAttributesByIds = {
      data,
      timestamp: Date.now(),
      shipIds: shipIds.map((id) => id.toString()),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to write ship attributes by-ids cache:", e);
  }
}

function jsonStringifyWithBigint(value: unknown): string {
  return JSON.stringify(value);
}

/** Read snapshot written by `fetchAndPersistShipAttributesCaches` (optional UI use). */
export function readShipAttributesContractSnapshot(
  chainId: number,
): ShipAttributesContractSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONTRACT_SNAPSHOT_KEY(chainId));
    if (!raw) return null;
    return JSON.parse(raw) as ShipAttributesContractSnapshotV1;
  } catch {
    return null;
  }
}

/**
 * Re-read ShipAttributes cost tables / versions and `calculateShipAttributesByIds`
 * for the current navy, then persist to localStorage (long-lived).
 */
export async function fetchAndPersistShipAttributesCaches(
  publicClient: PublicClient,
  params: {
    chainId: number;
    shipAttributesAddress: `0x${string}`;
    shipIds: number[];
  },
): Promise<void> {
  if (typeof window === "undefined") return;
  const { chainId, shipAttributesAddress, shipIds } = params;
  const abi = CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi;
  try {
    const [currentCostsVersion, currentAttributesVersion, costsTuple] =
      await Promise.all([
        publicClient.readContract({
          address: shipAttributesAddress,
          abi,
          functionName: "getCurrentCostsVersion",
        }),
        publicClient.readContract({
          address: shipAttributesAddress,
          abi,
          functionName: "getCurrentAttributesVersion",
        }),
        publicClient.readContract({
          address: shipAttributesAddress,
          abi,
          functionName: "getCosts",
        }),
      ]);

    const snapshot: ShipAttributesContractSnapshotV1 = {
      timestamp: Date.now(),
      chainId,
      currentCostsVersion: String(currentCostsVersion),
      currentAttributesVersion: String(currentAttributesVersion),
      getCosts: JSON.parse(jsonStringifyWithBigint(costsTuple)),
    };
    localStorage.setItem(
      CONTRACT_SNAPSHOT_KEY(chainId),
      JSON.stringify(snapshot),
    );

    if (shipIds.length === 0) return;

    const attrs = await publicClient.readContract({
      address: shipAttributesAddress,
      abi,
      functionName: "calculateShipAttributesByIds",
      args: [shipIds],
    });
    writeShipAttributesByIdsCache(chainId, shipIds, attrs as Attributes[]);
  } catch (e) {
    console.warn("fetchAndPersistShipAttributesCaches failed:", e);
  }
}
