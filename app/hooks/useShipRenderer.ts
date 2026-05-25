import { useState, useEffect, useRef, useMemo } from "react";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";
import {
  getCachedShipData,
  cacheShipData,
} from "./useShipDataCache";

// Debug flag
const DEBUG_RENDERER = false;

// Re-export rendering mode functions for compatibility
export { getUseLocalRendering, setUseLocalRendering } from "./useShipImageCache";

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_RENDERER) {
    console.log(...args);
  }
}

// In-memory cache for rendered images (LRU-style, max 100 images)
const renderedImageCache = new Map<string, string>();
const MAX_RENDERED_CACHE_SIZE = 100;
const renderedImageAccessOrder: string[] = [];

/**
 * Get cache key for rendered image
 */
function getRenderedImageKey(ship: Ship): string {
  const key = `${ship.id.toString()}-${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}-${ship.traits.accuracy}-${ship.traits.hull}-${ship.traits.speed}-${ship.traits.colors.h1}-${ship.traits.colors.s1}-${ship.traits.colors.l1}-${ship.shipData.shiny}-${ship.shipData.constructed}`;
  return key;
}

/**
 * Get rendered image from in-memory cache
 */
function getCachedRenderedImage(ship: Ship): string | null {
  const key = getRenderedImageKey(ship);
  const cached = renderedImageCache.get(key);
  if (cached) {
    const index = renderedImageAccessOrder.indexOf(key);
    if (index > -1) {
      renderedImageAccessOrder.splice(index, 1);
    }
    renderedImageAccessOrder.push(key);
    debugLog(`🎨 Using cached rendered image for ship ${ship.id.toString()}`);
    return cached;
  }
  return null;
}

/**
 * Cache rendered image in memory
 */
function cacheRenderedImage(ship: Ship, dataUrl: string): void {
  const key = getRenderedImageKey(ship);

  if (renderedImageCache.size >= MAX_RENDERED_CACHE_SIZE) {
    const oldestKey = renderedImageAccessOrder.shift();
    if (oldestKey) {
      renderedImageCache.delete(oldestKey);
      debugLog(`🗑️ Removed oldest rendered image from cache: ${oldestKey}`);
    }
  }

  renderedImageCache.set(key, dataUrl);
  renderedImageAccessOrder.push(key);
  debugLog(`💾 Cached rendered image for ship ${ship.id.toString()}`);
}

interface ShipImageState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  renderKey: number;
}

/**
 * Stable identity for render + cache. Must match {@link getRenderedImageKey} inputs.
 */
function getShipRenderEffectKey(ship: Ship): string {
  return getRenderedImageKey(ship);
}

/**
 * Hook for rendering ship images using local TypeScript renderer
 * This replaces useShipImageCache and eliminates the need for tokenURI contract calls
 */
export function useShipRenderer(ship: Ship): ShipImageState {
  const [imageState, setImageState] = useState<Omit<ShipImageState, "renderKey">>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });
  const [renderKey, setRenderKey] = useState(0);
  const shipId = ship?.id?.toString() || "unknown";

  const shipRef = useRef<Ship>(ship);

  const isValidShip = ship && ship.equipment && ship.traits && ship.shipData;

  const shipKey = useMemo(() => {
    if (!isValidShip) return "invalid";
    return getShipRenderEffectKey(ship);
  }, [
    isValidShip,
    ship?.id,
    ship?.equipment?.mainWeapon,
    ship?.equipment?.armor,
    ship?.equipment?.shields,
    ship?.equipment?.special,
    ship?.traits?.accuracy,
    ship?.traits?.hull,
    ship?.traits?.speed,
    ship?.traits?.colors?.h1,
    ship?.traits?.colors?.s1,
    ship?.traits?.colors?.l1,
    ship?.shipData?.shiny,
    ship?.shipData?.constructed,
    ship?.shipData?.timestampDestroyed,
  ]);

  shipRef.current = ship;

  const isDestroyed = isValidShip && ship.shipData.timestampDestroyed > Number(0);
  const isNotConstructed = isValidShip && !ship.shipData.constructed;

  useEffect(() => {
    let cancelled = false;

    if (!isValidShip) {
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: "Invalid ship data structure",
      });
      return;
    }

    const currentShipForLog = shipRef.current;
    debugLog(
      `🔍 Rendering ship ${shipId}, constructed: ${currentShipForLog.shipData.constructed}, destroyed: ${isDestroyed}`,
    );

    if (isNotConstructed || isDestroyed) {
      debugLog(
        `🚫 Ship ${shipId} is ${isNotConstructed ? "not constructed" : "destroyed"}, skipping render`,
      );
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const currentShip = shipRef.current;

    const cachedImage = getCachedRenderedImage(currentShip);
    if (cachedImage) {
      setImageState({
        dataUrl: cachedImage,
        isLoading: false,
        error: null,
      });
      return;
    }

    const cachedShipData = getCachedShipData(currentShip.id);
    if (cachedShipData) {
      debugLog(`📦 Found cached ship data for ${shipId}, using it for validation`);
    }

    cacheShipData(currentShip);

    setImageState({ dataUrl: null, isLoading: true, error: null });

    try {
      const dataUrl = renderShip(currentShip);

      if (!dataUrl || typeof dataUrl !== "string") {
        throw new Error(`renderShip returned invalid result: ${dataUrl}`);
      }

      cacheRenderedImage(currentShip, dataUrl);

      const testImg = new Image();
      testImg.onload = () => {
        if (cancelled) return;
        debugLog(`✅ Image for ship ${shipId} is valid`);
        setImageState({
          dataUrl,
          isLoading: false,
          error: null,
        });
        setRenderKey((prev) => prev + 1);
      };
      testImg.onerror = () => {
        if (cancelled) return;
        debugLog(`❌ Image for ship ${shipId} is invalid`);
        setImageState({
          dataUrl: null,
          isLoading: false,
          error: "Failed to generate valid image",
        });
      };
      testImg.src = dataUrl;
    } catch (error) {
      if (cancelled) return;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(
        `❌ Error generating image for ship ${shipId}:`,
        errorMessage,
        errorStack,
        error,
      );
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: errorMessage,
      });
    }

    return () => {
      cancelled = true;
    };
  }, [shipKey, shipId, isNotConstructed, isDestroyed, isValidShip]);

  return { ...imageState, renderKey };
}

// Re-export cache management functions for backward compatibility
export {
  clearShipImageCache,
  clearShipImageCacheForShip,
  clearBrokenImageCache,
  clearAllShipImageCache,
  resetShipRequestState,
  resetAllShipRequestStates,
  clearShipRetryTimeout,
  clearAllShipRetryTimeouts,
  restartQueueProcessing,
  getQueueStatus,
  clearCacheOnLogout,
  getShipImageCacheStats,
} from "./useShipImageCache";

// Export ship data cache functions
export {
  getCachedShipData,
  cacheShipData,
  clearShipDataCache,
  clearAllShipDataCache,
  getShipDataCacheStats,
  cacheShipsData,
} from "./useShipDataCache";
