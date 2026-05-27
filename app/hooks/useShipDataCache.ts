import { Ship } from "../types/types";

// Cache configuration
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 1000; // Can cache many more ships since data is smaller
const CACHE_KEY_PREFIX = "void-tactics-ship-data-";
function currentShipsContractAddress(): string {
  return "legacy";
}

function cacheNamespacePrefix(): string {
  return `${CACHE_KEY_PREFIX}${currentShipsContractAddress()}:`;
}

const MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit (larger since data is smaller)

// Debug flag
const DEBUG_CACHE = false;

interface CachedShipData {
  ship: Ship;
  timestamp: number;
  shipId: string;
  dataHash: string;
}

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_CACHE) {
    console.log(...args);
  }
}

/**
 * Calculate a hash of the ship data that affects rendering
 * This is used to detect if ship data has changed
 */
function calculateShipDataHash(ship: Ship): string {
  // Hash the relevant ship properties that affect rendering
  const data = {
    equipment: ship.equipment,
    traits: {
      ...ship.traits,
      // Convert BigInt to string so JSON.stringify works under SES
      serialNumber: ship.traits.serialNumber.toString(),
    },
    shipData: {
      shiny: ship.shipData.shiny,
      constructed: ship.shipData.constructed,
      // Convert BigInt to string for JSON serialization
      timestampDestroyed: ship.shipData.timestampDestroyed.toString(),
    },
  };
  // Simple hash using base64 encoding
  try {
    return btoa(JSON.stringify(data)).slice(0, 32);
  } catch {
    // Fallback if btoa fails
    return JSON.stringify(data).slice(0, 32);
  }
}

/**
 * Get cache key for a ship ID
 */
function getCacheKey(shipId: number): string {
  return `${cacheNamespacePrefix()}${shipId.toString()}`;
}

/**
 * Get cached ship data for a ship ID
 */
export function getCachedShipData(shipId: number): Ship | null {
  if (typeof window === "undefined") return null;

  try {
    const cacheKey = getCacheKey(shipId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      debugLog(`📦 No cached data for ship ${shipId.toString()}`);
      return null;
    }

    const parsed: CachedShipData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - parsed.timestamp > CACHE_EXPIRY_TIME) {
      debugLog(`⏰ Cache expired for ship ${shipId.toString()}`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Convert BigInt strings back to BigInt
    const ship: Ship = {
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

    debugLog(`✅ Found cached data for ship ${shipId.toString()}`);
    return ship;
  } catch (error) {
    debugLog(`❌ Error reading cache for ship ${shipId.toString()}:`, error);
    // Remove corrupted cache entry
    const cacheKey = getCacheKey(shipId);
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Cache ship data
 */
export function cacheShipData(ship: Ship): void {
  if (typeof window === "undefined") return;

  try {
    const cacheKey = getCacheKey(ship.id);
    const dataHash = calculateShipDataHash(ship);

    // Check if we already have this exact data cached
    const existing = getCachedShipData(ship.id);
    if (existing) {
      const existingHash = calculateShipDataHash(existing);
      if (existingHash === dataHash) {
        debugLog(`♻️ Ship ${ship.id.toString()} data unchanged, skipping cache update`);
        return;
      }
    }

    // Convert BigInt to string for JSON serialization
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
      ship: shipForStorage as unknown as Ship,
      timestamp: Date.now(),
      shipId: ship.id.toString(),
      dataHash,
    };

    // Check cache size before adding
    const currentSize = getShipDataCacheStats().size;
    const entrySize = JSON.stringify(cachedData).length;

    if (currentSize + entrySize > MAX_CACHE_SIZE_BYTES) {
      debugLog(`⚠️ Cache size limit reached, cleaning up old entries...`);
      cleanupOldCacheEntries();
    }

    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    debugLog(`💾 Cached data for ship ${ship.id.toString()}`);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "QuotaExceededError"
    ) {
      debugLog(`⚠️ Quota exceeded, cleaning up cache...`);
      cleanupOldCacheEntries();
      // Try again after cleanup
      try {
        const cacheKey = getCacheKey(ship.id);
        const dataHash = calculateShipDataHash(ship);
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
          ship: shipForStorage as unknown as Ship,
          timestamp: Date.now(),
          shipId: ship.id.toString(),
          dataHash,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cachedData));
        debugLog(`💾 Successfully cached ship ${ship.id.toString()} after cleanup`);
      } catch (retryError) {
        debugLog(`❌ Still failed to cache ship ${ship.id.toString()}:`, retryError);
      }
    } else {
      debugLog(`❌ Error caching ship ${ship.id.toString()}:`, error);
    }
  }
}

/**
 * Clean up old cache entries (LRU-style)
 */
function cleanupOldCacheEntries(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(cacheNamespacePrefix())
    );

    if (keys.length === 0) return;

    // Sort by timestamp (oldest first)
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

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
      debugLog(`🗑️ Removed old cache entry: ${entries[i].key}`);
    }
  } catch (error) {
    debugLog(`❌ Error cleaning up cache:`, error);
  }
}

/**
 * Clear cache for a specific ship
 */
export function clearShipDataCache(shipId: number): void {
  if (typeof window === "undefined") return;

  const cacheKey = getCacheKey(shipId);
  localStorage.removeItem(cacheKey);
  debugLog(`🗑️ Cleared cache for ship ${shipId.toString()}`);
}

/**
 * Clear all ship data cache
 */
export function clearAllShipDataCache(): void {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(cacheNamespacePrefix())
  );

  keys.forEach((key) => localStorage.removeItem(key));
  debugLog(`🗑️ Cleared all ship data cache (${keys.length} entries)`);
}

/**
 * Get cache statistics
 */
export function getShipDataCacheStats(): {
  count: number;
  size: number;
  maxSize: number;
} {
  if (typeof window === "undefined") {
    return { count: 0, size: 0, maxSize: MAX_CACHE_SIZE };
  }

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(cacheNamespacePrefix())
  );

  let totalSize = 0;
  keys.forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length;
    }
  });

  return {
    count: keys.length,
    size: totalSize,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Batch cache multiple ships
 */
export function cacheShipsData(ships: Ship[]): void {
  ships.forEach((ship) => cacheShipData(ship));
}
