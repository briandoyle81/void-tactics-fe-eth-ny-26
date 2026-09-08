import type { Abi, PublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID, getContractAddresses } from "../config/contracts";
import type { Attributes } from "../types/types";

const SHIP_ATTRIBUTES_BY_IDS_CACHE_KEY_PREFIX =
  "ship-attributes-cache-v2" as const;

function shipAttributesByIdsCacheKey(chainId: number): string {
  return `${SHIP_ATTRIBUTES_BY_IDS_CACHE_KEY_PREFIX}:${chainId}`;
}

const CONTRACT_SNAPSHOT_KEY = (chainId: number) =>
  `warpflow-ship-attributes-contract-v1-${chainId}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * The contract address(es) that determine what shipId N *means*. A cached
 * entry is only valid if these still match what's currently deployed —
 * otherwise a redeploy (fresh Ships/ShipAttributes contracts, ship ids
 * starting over from 1) can silently serve one ship's old attributes for a
 * completely different ship that happens to reuse the same numeric id.
 * `shipsAddress` mirrors useShipsByIds.ts's own ShipsRouter-on-Base-Sepolia
 * resolution — same reasoning: on Base Sepolia, ShipsRouter (not Ships
 * directly) is what actually resolves a shipId, so a ShipsRouter redeploy
 * needs to bust this cache too, not just a Ships/ShipAttributes one.
 */
function resolveShipsAddress(chainId: number): string {
  const shipsRouterAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
    ?.SHIPS_ROUTER as string | undefined;
  if (
    chainId === baseSepolia.id &&
    shipsRouterAddress &&
    shipsRouterAddress.toLowerCase() !== ZERO_ADDRESS
  ) {
    return shipsRouterAddress;
  }
  return getContractAddresses(chainId).SHIPS as string;
}

export interface ShipAttributesCacheContractFingerprint {
  shipAttributesAddress: string;
  shipsAddress: string;
}

export function resolveShipAttributesCacheFingerprint(
  chainId: number,
): ShipAttributesCacheContractFingerprint {
  return {
    shipAttributesAddress: (
      getContractAddresses(chainId).SHIP_ATTRIBUTES as string
    ).toLowerCase(),
    shipsAddress: resolveShipsAddress(chainId).toLowerCase(),
  };
}

/**
 * Long TTL — safe because redeploys are now caught by the contract
 * fingerprint check above (new ShipAttributes/Ships/ShipsRouter address ->
 * cache miss), and known in-place mutations (DroneYard modifyShip) call
 * `invalidateShipAttributesByIdsCache` directly rather than waiting out the
 * TTL. Other theoretical staleness sources (repairs, rank-ups from kills,
 * etc.) aren't covered yet — deliberately deferred; a real invalidation
 * mechanism for prod-cadence attribute-table adjustments is planned as
 * follow-up work once core dev wraps, not solved by shortening this.
 */
export const SHIP_ATTRIBUTES_LOCAL_CACHE_MS = 365 * 24 * 60 * 60 * 1000;

/** Order-sensitive; must match `useShipAttributesByIds` shipIds string. */
export function shipIdsToCacheKeyString(shipIds: bigint[]): string {
  return shipIds.map((id) => id.toString()).join(",");
}

interface CachedAttributesByIds {
  data: Attributes[];
  timestamp: number;
  shipIds: string[];
  /** Absent on entries written before this fingerprint check existed —
   * treated as a mismatch (cache miss) rather than trusted, since there's
   * no way to know what contracts they were computed against. */
  shipAttributesAddress?: string;
  shipsAddress?: string;
}

export type ShipAttributesContractSnapshotV1 = {
  timestamp: number;
  chainId: number;
  currentCostsVersion: string;
  currentAttributesVersion: string;
  /** `getCosts()` return; bigints stored as strings. */
  getCosts: unknown;
};

export function readValidShipAttributesByIdsCache(
  chainId: number,
  shipIdsString: string,
  fingerprint: ShipAttributesCacheContractFingerprint = resolveShipAttributesCacheFingerprint(chainId),
): Attributes[] | null {
  if (typeof window === "undefined") return null;
  try {
    const key = shipAttributesByIdsCacheKey(chainId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAttributesByIds;
    if (
      Date.now() - parsed.timestamp < SHIP_ATTRIBUTES_LOCAL_CACHE_MS &&
      parsed.shipIds.join(",") === shipIdsString &&
      parsed.shipAttributesAddress === fingerprint.shipAttributesAddress &&
      parsed.shipsAddress === fingerprint.shipsAddress
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

/** Drops the cached attributes blob for a chain outright, so the next read
 * is guaranteed to hit the contract regardless of TTL — call this right
 * after any transaction that can change a ship's attributes (equipment,
 * traits, `modified`) outside the normal fetch/cache cycle.
 *
 * The cache only ever holds one blob per chain — whatever exact shipIds
 * combination was last fetched — so there's no per-ship storage to clear
 * surgically. Passing `shipId` narrows the blast radius as far as that
 * allows: the blob is only dropped if the modified ship is actually part of
 * it (leaving an unrelated cached combination alone); omit `shipId` to
 * always clear, e.g. when the id isn't known. */
export function invalidateShipAttributesByIdsCache(
  chainId: number,
  shipId?: bigint,
): void {
  if (typeof window === "undefined") return;
  const key = shipAttributesByIdsCacheKey(chainId);
  try {
    if (shipId != null) {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CachedAttributesByIds;
      if (!parsed.shipIds.includes(shipId.toString())) return;
    }
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to invalidate ship attributes by-ids cache:", e);
  }
}

export function writeShipAttributesByIdsCache(
  chainId: number,
  shipIds: bigint[],
  data: Attributes[],
  fingerprint: ShipAttributesCacheContractFingerprint = resolveShipAttributesCacheFingerprint(chainId),
): void {
  if (typeof window === "undefined") return;
  try {
    const key = shipAttributesByIdsCacheKey(chainId);
    const payload: CachedAttributesByIds = {
      data,
      timestamp: Date.now(),
      shipIds: shipIds.map((id) => id.toString()),
      shipAttributesAddress: fingerprint.shipAttributesAddress,
      shipsAddress: fingerprint.shipsAddress,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to write ship attributes by-ids cache:", e);
  }
}

function jsonStringifyWithBigint(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
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
    shipIds: bigint[];
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
