import { useState, useEffect, useCallback, useRef } from "react";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";

const SHIPS_ABI = CONTRACT_ABIS.SHIPS as Abi;

// Cache configuration
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50; // Reduced from 1000 to prevent quota issues
const CACHE_KEY_PREFIX = "void-tactics-ship-image-";
const MAX_CACHE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const SHIPS_ADDRESS_STORAGE_KEY = "void-tactics-ships-contract-address";

// Rate limiting configuration
const REQUEST_DELAY = 100; // 100ms between requests
const MAX_CONCURRENT_REQUESTS = 3; // Maximum concurrent requests

// Debug flag - set to false to disable console logs
const DEBUG_CACHE = false;

// Local storage key for rendering mode
const USE_LOCAL_RENDERING_KEY = "void-tactics-use-local-rendering";

function currentShipsContractAddress(): string {
  return String(CONTRACT_ADDRESSES.SHIPS ?? "").toLowerCase();
}

function imageCachePrefix(): string {
  return `${CACHE_KEY_PREFIX}${currentShipsContractAddress()}:`;
}

// Get rendering mode from localStorage
export function getUseLocalRendering(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(USE_LOCAL_RENDERING_KEY);
  return stored === "true";
}

// Set rendering mode in localStorage
export function setUseLocalRendering(useLocal: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USE_LOCAL_RENDERING_KEY, useLocal ? "true" : "false");
}

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_CACHE) {
    console.log(...args);
  }
}

// Retry configuration
const MAX_RETRIES = 10; // Maximum number of retries
const RETRY_DELAY = 2000; // 2 seconds between retries

// Global request queue and state
const requestQueue: Array<() => Promise<void>> = [];
let activeRequests = 0;
let isProcessingQueue = false;

interface CachedImage {
  dataUrl: string;
  timestamp: number;
  shipId: string;
}

interface ShipImageState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

function isUserLoggedIn(): boolean {
  // Use next-auth session storage key instead of wagmi
  if (typeof window === "undefined") return false;
  try {
    const session = sessionStorage.getItem("next-auth.session-token") ??
      localStorage.getItem("next-auth.session-token");
    return session !== null;
  } catch {
    return false;
  }
}

// Process the request queue with rate limiting
const processQueue = async () => {
  debugLog(
    `🔄 Processing queue: ${requestQueue.length} requests, ${activeRequests} active, processing: ${isProcessingQueue}`
  );

  // If user is not logged in, clear the queue and stop processing
  if (!isUserLoggedIn()) {
    debugLog("🚫 User not logged in, clearing queue and stopping processing");
    requestQueue.length = 0;
    isProcessingQueue = false;
    activeRequests = 0;
    return;
  }

  // If we're already processing or at max capacity, just return
  if (isProcessingQueue || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    debugLog(
      `⏸️ Queue processing paused: processing=${isProcessingQueue}, active=${activeRequests}, max=${MAX_CONCURRENT_REQUESTS}`
    );
    return;
  }

  // If no requests, reset processing flag and return
  if (requestQueue.length === 0) {
    isProcessingQueue = false;
    debugLog(`🏁 Queue processing finished (no more requests)`);
    return;
  }

  isProcessingQueue = true;
  debugLog(`▶️ Starting queue processing`);

  // Process one request at a time to avoid complexity
  const request = requestQueue.shift();
  if (request) {
    activeRequests++;
    debugLog(`🚀 Executing request, active: ${activeRequests}`);

    request().finally(() => {
      activeRequests--;
      debugLog(`✅ Request completed, active: ${activeRequests}`);

      // Reset processing flag
      isProcessingQueue = false;

      // Add delay between requests
      setTimeout(() => {
        // Process next request if any
        if (requestQueue.length > 0) {
          processQueue();
        } else {
          debugLog(`🏁 Queue processing finished`);
        }
      }, REQUEST_DELAY);
    });
  } else {
    // No request to process, reset flag
    isProcessingQueue = false;
    debugLog(`🏁 Queue processing finished (no request found)`);
  }
};

export function useShipImageCache(ship: Ship) {
  const [imageState, setImageState] = useState<ShipImageState>({
    dataUrl: null,
    isLoading: false,
    error: null,
    retryCount: 0,
  });
  const [renderKey, setRenderKey] = useState(0);

  const publicClient = null;
  const cacheKey = `${imageCachePrefix()}${ship.id.toString()}`;
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shipId = ship.id.toString();
  const shipRequestKey = `${currentShipsContractAddress()}:${shipId}`;

  // Get cached image from localStorage
  const getCachedImage = useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed: CachedImage = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRY_TIME;

      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return parsed.dataUrl;
    } catch (error) {
      debugLog("Error reading cached image:", error);
      return null;
    }
  }, [cacheKey]);

  // Save image to cache
  const saveToCache = useCallback(
    (dataUrl: string) => {
      if (typeof window === "undefined") return;

      try {
        // Check and cleanup cache before saving
        checkAndCleanupCache();

        const cached: CachedImage = {
          dataUrl,
          timestamp: Date.now(),
          shipId: ship.id.toString(),
        };

        localStorage.setItem(cacheKey, JSON.stringify(cached));
        debugLog(`💾 Cached image for ship ${ship.id.toString()}`);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          console.warn(
            `⚠️ Quota exceeded for ship ${ship.id.toString()}, clearing cache and retrying...`
          );
          // Clear all cache and try again
          clearAllShipImageCache();
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                dataUrl,
                timestamp: Date.now(),
                shipId: ship.id.toString(),
              })
            );
            debugLog(
              `💾 Successfully cached image for ship ${ship.id.toString()} after cleanup`
            );
          } catch (retryError) {
            debugLog(
              `❌ Still failed to cache image for ship ${ship.id.toString()}:`,
              retryError
            );
          }
        } else {
          debugLog("Error saving image to cache:", error);
        }
      }
    },
    [cacheKey, ship.id]
  );

  // Generate image locally using TypeScript renderer
  const generateImageLocally = useCallback((): string | null => {
    try {
      debugLog(`🎨 Generating image locally for ship ${ship.id.toString()}`);
      const dataUrl = renderShip(ship);

      // Test the image before saving
      const testImg = new Image();
      testImg.onload = () => {
        debugLog(`✅ Successfully generated local image for ship ${ship.id.toString()}`);
        saveToCache(dataUrl);
        setImageState({
          dataUrl,
          isLoading: false,
          error: null,
          retryCount: 0,
        });
        setRenderKey((prev) => prev + 1);
      };
      testImg.onerror = () => {
        debugLog(`❌ Generated local image for ship ${ship.id.toString()} is invalid`);
        setImageState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to generate image locally",
        }));
      };
      testImg.src = dataUrl;

      return dataUrl;
    } catch (error) {
      debugLog(`❌ Error generating local image for ship ${ship.id.toString()}:`, error);
      setImageState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to generate image",
      }));
      return null;
    }
  }, [ship, saveToCache]);

  // Fetch image from contract — no-op: publicClient removed with wagmi
  const fetchImageFromContract = useCallback(async () => {
    if (!publicClient) return; // always returns early

    const attemptFetch = async (retryCount: number): Promise<void> => {
      try {
        debugLog(
          `🔄 Attempting to fetch ship ${ship.id.toString()} image (attempt ${
            retryCount + 1
          })`
        );
        setImageState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          retryCount,
        }));

        // Call tokenURI directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenURI = await (publicClient as any).readContract({
          address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
          abi: SHIPS_ABI,
          functionName: "tokenURI",
          args: [ship.id],
        });

        if (!tokenURI) {
          throw new Error("No tokenURI returned");
        }

        // Parse the tokenURI (should be a data URI with JSON)
        const tokenURIString = tokenURI as string;
        const [, encodedData] = tokenURIString.split(",");
        if (!encodedData) {
          throw new Error("Invalid tokenURI format");
        }

        // Decode the base64 JSON metadata
        const jsonString = atob(encodedData);
        const metadata = JSON.parse(jsonString);

        // Extract the image data (should be base64 encoded SVG)
        const imageData = metadata.image;
        if (!imageData) {
          throw new Error("No image data in metadata");
        }

        // If it's a data URI, extract the base64 part
        let base64Data = imageData;
        if (imageData.startsWith("data:image/svg+xml;base64,")) {
          base64Data = imageData.split(",")[1];
        }

        // Create data URL for the image
        const dataUrl = `data:image/svg+xml;base64,${base64Data}`;

        // Test the image before saving - use Promise to make it synchronous
        await new Promise<void>((resolve, reject) => {
          const testImg = new Image();
          testImg.onload = () => {
            debugLog(`✅ Successfully loaded ship ${ship.id.toString()} image`);
            // Image is valid, save to cache and update state
            saveToCache(dataUrl);

            // Update state immediately
            setImageState({
              dataUrl,
              isLoading: false,
              error: null,
              retryCount: 0,
            });
            setRenderKey((prev) => prev + 1);
            debugLog(`🔄 Updated state for ship ${ship.id.toString()}`);

            // Clear the request state since we successfully loaded the image
            shipRequestStates.delete(shipRequestKey);
            debugLog(
              `✅ Cleared request state for successfully loaded ship ${shipId}`
            );

            resolve();
          };
          testImg.onerror = () => {
            debugLog(
              `❌ Generated image for ship ${ship.id.toString()} is invalid`
            );
            reject(new Error("Generated image is invalid"));
          };
          testImg.src = dataUrl;
        });
      } catch (error) {
        debugLog(
          `Error fetching ship image (attempt ${retryCount + 1}):`,
          error
        );

        // Check if we should stop retrying
        if (retryCount >= MAX_RETRIES) {
          debugLog(
            `🚫 Ship ${shipId} exceeded max retries, stopping retry loop`
          );
          setImageState((prev) => ({
            ...prev,
            isLoading: false,
            error: `Failed to load image after ${MAX_RETRIES} attempts`,
            retryCount: retryCount,
          }));
          // Clear the request state to allow re-fetching in the future
          shipRequestStates.delete(shipRequestKey);
          return;
        }

        // Continue retrying with proper delay
        const nextRetryCount = retryCount + 1;
        const delay = RETRY_DELAY;

        debugLog(
          `⏳ Retrying ship ${ship.id.toString()} image in ${delay}ms (attempt ${
            nextRetryCount + 1
          })`
        );

        setImageState((prev) => ({
          ...prev,
          isLoading: true,
          error: `Retrying... (attempt ${nextRetryCount + 1})`,
          retryCount: nextRetryCount,
        }));

        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        clearShipRetryTimeout(shipId);

        // Schedule next retry with proper delay
        const timeout = setTimeout(() => {
          attemptFetch(nextRetryCount);
        }, delay);

        retryTimeoutRef.current = timeout;
        shipRetryTimeouts.set(shipId, timeout);
      }
    };

    attemptFetch(0);
  }, [ship.id, saveToCache, shipId, shipRequestKey]);

  // Load cached image on mount
  useEffect(() => {
    debugLog(
      `🔍 Checking cache for ship ${shipId}, hasRequested: ${shipRequestStates.get(
        shipRequestKey
      )}, constructed: ${ship.shipData.constructed}`
    );

    // For unconstructed ships, don't try to fetch from contract
    if (!ship.shipData.constructed) {
      debugLog(`🚫 Ship ${shipId} is not constructed, skipping contract fetch`);
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: null,
        retryCount: 0,
      });
      return;
    }

    const cached = getCachedImage();
    if (cached) {
      debugLog(`📦 Found cached image for ship ${shipId}, testing validity...`);
      // Test if the cached image is valid by creating an Image object
      const testImg = new Image();
      testImg.onload = () => {
        debugLog(`✅ Cached image for ship ${shipId} is valid, using it`);
        // Update state immediately
        setImageState({
          dataUrl: cached,
          isLoading: false,
          error: null,
          retryCount: 0,
        });
        setRenderKey((prev) => prev + 1);
        debugLog(`🔄 Updated state for cached ship ${shipId}`);
      };
      testImg.onerror = () => {
        debugLog(`❌ Cached image for ship ${shipId} is broken, refetching...`);
        // Remove broken cache entry
        localStorage.removeItem(cacheKey);
        // Reset retry count and add to queue to refetch
        setImageState((prev) => ({ ...prev, retryCount: 0 }));
        if (!shipRequestStates.get(shipRequestKey)) {
          shipRequestStates.set(shipRequestKey, true);
          debugLog(`🔄 Adding ship ${shipId} to request queue for refetch`);
          requestQueue.push(fetchImageFromContract);
          processQueue();
        } else {
          debugLog(`⚠️ Ship ${shipId} already requested, skipping refetch`);
        }
      };
      testImg.src = cached;
    } else if (!shipRequestStates.get(shipRequestKey)) {
      // Check if we should use local rendering
      const useLocalRendering = getUseLocalRendering();

      if (useLocalRendering) {
        debugLog(`🎨 Using local rendering for ship ${shipId}`);
        setImageState((prev) => ({ ...prev, isLoading: true }));
        const localImage = generateImageLocally();
        if (localImage) {
          // Image generation is async via Image.onload, state will update there
          return;
        }
      } else {
        // Add to queue if not cached and not already requested
        debugLog(`📤 No cache for ship ${shipId}, adding to request queue`);
        shipRequestStates.set(shipRequestKey, true);
        requestQueue.push(fetchImageFromContract);
        processQueue();
      }
    } else {
      debugLog(
        `⚠️ Ship ${shipId} already requested, skipping - this might be the problem!`
      );
      debugLog(
        `🔍 Current request states:`,
        Array.from(shipRequestStates.entries())
      );
    }
  }, [
    getCachedImage,
    fetchImageFromContract,
    generateImageLocally,
    cacheKey,
    shipId,
    shipRequestKey,
    ship.shipData.constructed,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    const controller = abortControllerRef.current;
    const timeout = retryTimeoutRef.current;
    return () => {
      if (controller) {
        controller.abort();
      }
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return { ...imageState, renderKey };
}

// Utility function to clear all cached images
export function clearShipImageCache() {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(imageCachePrefix())
  );

  keys.forEach((key) => localStorage.removeItem(key));
}

// Utility function to get cache stats
export function getShipImageCacheStats() {
  if (typeof window === "undefined") return { count: 0, size: 0 };

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(imageCachePrefix())
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

// Utility function to clear cache for a specific ship
export function clearShipImageCacheForShip(shipId: string) {
  if (typeof window === "undefined") return;

  const cacheKey = `${imageCachePrefix()}${shipId}`;
  localStorage.removeItem(cacheKey);
  debugLog(`Cleared cache for ship ${shipId}`);
}

// Utility function to clear all broken images from cache
export function clearBrokenImageCache() {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(imageCachePrefix())
  );

  let clearedCount = 0;
  keys.forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed: CachedImage = JSON.parse(data);
        // Test if the image is valid
        const testImg = new Image();
        testImg.onload = () => {
          // Image is valid, keep it
        };
        testImg.onerror = () => {
          // Image is broken, remove it
          localStorage.removeItem(key);
          clearedCount++;
        };
        testImg.src = parsed.dataUrl;
      } catch {
        // Invalid cache entry, remove it
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
  });

  debugLog(`Cleared ${clearedCount} broken images from cache`);
  return clearedCount;
}

// Utility function to clear all cache and reset request state
export function clearAllShipImageCache() {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(imageCachePrefix())
  );

  keys.forEach((key) => localStorage.removeItem(key));

  // Clear all request states
  shipRequestStates.clear();

  debugLog(
    `Cleared all ${keys.length} ship images from cache and reset request states`
  );
  return keys.length;
}

// Global map to track request states per ship
const shipRequestStates = new Map<string, boolean>();

// Function to check localStorage quota and clean up if needed
const checkAndCleanupCache = () => {
  if (typeof window === "undefined") return;

  try {
    // Check current localStorage usage
    let totalSize = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(imageCachePrefix())) {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }
    });

    debugLog(
      `📊 Current cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
    );

    // If we're over the limit, clean up old entries
    if (
      totalSize > MAX_CACHE_SIZE_BYTES ||
      keys.filter((k) => k.startsWith(imageCachePrefix())).length >
        MAX_CACHE_SIZE
    ) {
      debugLog(`🧹 Cache cleanup needed, removing oldest entries...`);

      const cacheEntries = keys
        .filter((key) => key.startsWith(imageCachePrefix()))
        .map((key) => {
          const data = localStorage.getItem(key);
          if (!data) return { key, timestamp: 0, size: 0 };
          try {
            const parsed = JSON.parse(data);
            return {
              key,
              timestamp: parsed.timestamp || 0,
              size: data.length,
            };
          } catch {
            return { key, timestamp: 0, size: data.length };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 30% of entries
      const toRemove = Math.floor(cacheEntries.length * 0.3);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(cacheEntries[i].key);
      }

      debugLog(`🗑️ Removed ${toRemove} old cache entries`);
    }
  } catch (error) {
    debugLog("Error during cache cleanup:", error);
  }
};

// Utility function to reset request state for a specific ship
export function resetShipRequestState(shipId: string) {
  shipRequestStates.delete(`${currentShipsContractAddress()}:${shipId}`);
  debugLog(`Reset request state for ship ${shipId}`);
}

// Utility function to reset all request states
export function resetAllShipRequestStates() {
  shipRequestStates.clear();
  debugLog(`Reset all ship request states`);
}

// Global map to track retry timeouts per ship
const shipRetryTimeouts = new Map<string, NodeJS.Timeout>();

// Utility function to clear retry timeouts for a specific ship
export function clearShipRetryTimeout(shipId: string) {
  const timeout = shipRetryTimeouts.get(shipId);
  if (timeout) {
    clearTimeout(timeout);
    shipRetryTimeouts.delete(shipId);
    debugLog(`Cleared retry timeout for ship ${shipId}`);
  }
}

// Utility function to clear all retry timeouts
export function clearAllShipRetryTimeouts() {
  shipRetryTimeouts.forEach((timeout, shipId) => {
    clearTimeout(timeout);
    debugLog(`Cleared retry timeout for ship ${shipId}`);
  });
  shipRetryTimeouts.clear();
  debugLog(`Cleared all ship retry timeouts`);
}

// Initialize cache system on page load
const initializeCacheSystem = () => {
  if (typeof window !== "undefined") {
    // Clear request states and retry timeouts
    shipRequestStates.clear();
    clearAllShipRetryTimeouts();

    // Check and cleanup cache
    checkAndCleanupCache();

    // Flush cache if Ships contract address changed
    try {
      const currentAddress = (CONTRACT_ADDRESSES.SHIPS as string) || "";
      const storedAddress = localStorage.getItem(SHIPS_ADDRESS_STORAGE_KEY);
      if (storedAddress && storedAddress !== currentAddress) {
        clearAllShipImageCache();
      }
      if (currentAddress && storedAddress !== currentAddress) {
        localStorage.setItem(SHIPS_ADDRESS_STORAGE_KEY, currentAddress);
      }
    } catch {}

    debugLog("🚀 Cache system initialized");
  }
};

// Periodic queue check to prevent getting stuck
let queueCheckInterval: NodeJS.Timeout | null = null;

function startQueueCheck() {
  if (queueCheckInterval) return; // Already running

  queueCheckInterval = setInterval(() => {
    if (requestQueue.length > 0 && !isProcessingQueue && activeRequests === 0) {
      debugLog(
        `🔄 Periodic queue check: restarting stuck queue with ${requestQueue.length} requests`
      );
      processQueue();
    }
  }, 5000); // Check every 5 seconds
}

function stopQueueCheck() {
  if (queueCheckInterval) {
    clearInterval(queueCheckInterval);
    queueCheckInterval = null;
    debugLog("🛑 Stopped periodic queue check");
  }
}

// All module-level side effects gated on client environment to prevent SSR issues.
if (typeof window !== "undefined") {
  initializeCacheSystem();
  startQueueCheck();
  window.addEventListener("beforeunload", () => {
    stopQueueCheck();
    isProcessingQueue = false;
    activeRequests = 0;
    requestQueue.length = 0;
    shipRequestStates.clear();
    shipRetryTimeouts.clear();
  });
}

// Utility function to manually restart queue processing
export function restartQueueProcessing() {
  debugLog("🔄 Manually restarting queue processing...");
  isProcessingQueue = false;
  activeRequests = 0;
  processQueue();
}

// Utility function to get queue status
export function getQueueStatus() {
  return {
    queueLength: requestQueue.length,
    activeRequests,
    isProcessing: isProcessingQueue,
    maxConcurrent: MAX_CONCURRENT_REQUESTS,
  };
}

// Utility function to clear everything on logout
export function clearCacheOnLogout() {
  debugLog("🚪 Clearing cache system on logout");
  stopQueueCheck();
  isProcessingQueue = false;
  activeRequests = 0;
  requestQueue.length = 0;
  shipRequestStates.clear();
  shipRetryTimeouts.clear();

  // Clear localStorage cache
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("shipImage_")) {
        localStorage.removeItem(key);
      }
    });
    debugLog("🧹 Cleared all ship image cache from localStorage");
  } catch (error) {
    debugLog("❌ Error clearing localStorage cache:", error);
  }
}
