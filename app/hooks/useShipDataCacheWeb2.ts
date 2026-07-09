import { Web2Ship } from "../types/web2Ship";

// Web2-mode counterpart to `useShipDataCache.ts` — same localStorage caching
// strategy, parameterized over `Web2Ship` (plain number ids) instead of the
// web3 `Ship` type. Uses a distinct key prefix ("legacy" instead of a
// contract address) so its cache entries never collide with web3's.

const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 1000;
const CACHE_KEY_PREFIX = "void-tactics-ship-data-";

function cacheNamespacePrefix(): string {
  return `${CACHE_KEY_PREFIX}legacy:`;
}

const MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const DEBUG_CACHE = false;

interface CachedShipData {
  ship: Web2Ship;
  timestamp: number;
  shipId: string;
  dataHash: string;
}

function debugLog(...args: unknown[]) {
  if (DEBUG_CACHE) {
    console.log(...args);
  }
}

function calculateShipDataHash(ship: Web2Ship): string {
  const data = {
    equipment: ship.equipment,
    traits: {
      ...ship.traits,
      serialNumber: ship.traits.serialNumber.toString(),
    },
    shipData: {
      shiny: ship.shipData.shiny,
      constructed: ship.shipData.constructed,
      timestampDestroyed: ship.shipData.timestampDestroyed.toString(),
    },
  };
  try {
    return btoa(JSON.stringify(data)).slice(0, 32);
  } catch {
    return JSON.stringify(data).slice(0, 32);
  }
}

function getCacheKey(shipId: number): string {
  return `${cacheNamespacePrefix()}${shipId.toString()}`;
}

export function getCachedShipData(shipId: number): Web2Ship | null {
  if (typeof window === "undefined") return null;

  try {
    const cacheKey = getCacheKey(shipId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed: CachedShipData = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    const ship: Web2Ship = {
      ...parsed.ship,
      id: Number(parsed.ship.id),
      traits: {
        ...parsed.ship.traits,
        serialNumber: Number(parsed.ship.traits.serialNumber),
      },
      shipData: {
        ...parsed.ship.shipData,
        timestampDestroyed: Number(parsed.ship.shipData.timestampDestroyed),
      },
    };

    return ship;
  } catch (error) {
    debugLog(`Error reading cache for ship ${shipId}:`, error);
    localStorage.removeItem(getCacheKey(shipId));
    return null;
  }
}

export function cacheShipData(ship: Web2Ship): void {
  if (typeof window === "undefined") return;

  try {
    const cacheKey = getCacheKey(ship.id);
    const dataHash = calculateShipDataHash(ship);

    const existing = getCachedShipData(ship.id);
    if (existing && calculateShipDataHash(existing) === dataHash) {
      return;
    }

    const shipForStorage = {
      ...ship,
      id: ship.id.toString(),
      traits: {
        ...ship.traits,
        serialNumber: ship.traits.serialNumber.toString(),
      },
      shipData: {
        ...ship.shipData,
        timestampDestroyed: ship.shipData.timestampDestroyed.toString(),
      },
    };

    const cachedData: CachedShipData = {
      ship: shipForStorage as unknown as Web2Ship,
      timestamp: Date.now(),
      shipId: ship.id.toString(),
      dataHash,
    };

    const currentSize = getShipDataCacheStats().size;
    const entrySize = JSON.stringify(cachedData).length;

    if (currentSize + entrySize > MAX_CACHE_SIZE_BYTES) {
      cleanupOldCacheEntries();
    }

    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      cleanupOldCacheEntries();
      debugLog(`Quota exceeded caching ship ${ship.id}, gave up after cleanup`, error);
    } else {
      debugLog(`Error caching ship ${ship.id}:`, error);
    }
  }
}

function cleanupOldCacheEntries(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(cacheNamespacePrefix()),
    );
    if (keys.length === 0) return;

    const entries = keys
      .map((key) => {
        try {
          const data = localStorage.getItem(key);
          if (!data) return null;
          const parsed: CachedShipData = JSON.parse(data);
          return { key, timestamp: parsed.timestamp };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { key: string; timestamp: number } => entry !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  } catch (error) {
    debugLog("Error cleaning up cache:", error);
  }
}

export function clearShipDataCache(shipId: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getCacheKey(shipId));
}

export function clearAllShipDataCache(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(cacheNamespacePrefix()),
  );
  keys.forEach((key) => localStorage.removeItem(key));
}

export function getShipDataCacheStats(): {
  count: number;
  size: number;
  maxSize: number;
} {
  if (typeof window === "undefined") {
    return { count: 0, size: 0, maxSize: MAX_CACHE_SIZE };
  }

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(cacheNamespacePrefix()),
  );

  let totalSize = 0;
  keys.forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) totalSize += data.length;
  });

  return { count: keys.length, size: totalSize, maxSize: MAX_CACHE_SIZE };
}

export function cacheShipsData(ships: Web2Ship[]): void {
  ships.forEach((ship) => cacheShipData(ship));
}
