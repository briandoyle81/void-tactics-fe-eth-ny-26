import { useState, useEffect, useRef, useMemo } from "react";
import { Web2Ship } from "../types/web2Ship";
import { renderShip } from "../utils/shipRenderer";
import { getCachedShipData, cacheShipData } from "./useShipDataCacheWeb2";

// Web2-mode counterpart to `useShipRenderer.ts` — same in-memory rendered-
// image cache and local-renderer strategy, typed on `Web2Ship` and backed by
// `useShipDataCacheWeb2` instead of the web3 cache. Both hooks call the same
// shared `renderShip()` (see app/types/shipVisual.ts); `Web2Ship` already
// satisfies `ShipVisual` structurally, so no adapter is needed here.

const DEBUG_RENDERER = false;

function debugLog(...args: unknown[]) {
  if (DEBUG_RENDERER) {
    console.log(...args);
  }
}

// In-memory cache for rendered images (LRU-style, max 100 images)
const renderedImageCache = new Map<string, string>();
const MAX_RENDERED_CACHE_SIZE = 100;
const renderedImageAccessOrder: string[] = [];

function getRenderedImageKey(ship: Web2Ship): string {
  return `${ship.id.toString()}-${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}-${ship.traits.accuracy}-${ship.traits.hull}-${ship.traits.speed}-${ship.traits.colors.h1}-${ship.traits.colors.s1}-${ship.traits.colors.l1}-${ship.shipData.shiny}-${ship.shipData.constructed}`;
}

function getCachedRenderedImage(ship: Web2Ship): string | null {
  const key = getRenderedImageKey(ship);
  const cached = renderedImageCache.get(key);
  if (cached) {
    const index = renderedImageAccessOrder.indexOf(key);
    if (index > -1) {
      renderedImageAccessOrder.splice(index, 1);
    }
    renderedImageAccessOrder.push(key);
    return cached;
  }
  return null;
}

function cacheRenderedImage(ship: Web2Ship, dataUrl: string): void {
  const key = getRenderedImageKey(ship);

  if (renderedImageCache.size >= MAX_RENDERED_CACHE_SIZE) {
    const oldestKey = renderedImageAccessOrder.shift();
    if (oldestKey) {
      renderedImageCache.delete(oldestKey);
    }
  }

  renderedImageCache.set(key, dataUrl);
  renderedImageAccessOrder.push(key);
}

interface ShipImageState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  renderKey: number;
}

export function useShipRendererWeb2(ship: Web2Ship): ShipImageState {
  const [imageState, setImageState] = useState<Omit<ShipImageState, "renderKey">>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });
  const [renderKey, setRenderKey] = useState(0);
  const shipId = ship?.id?.toString() || "unknown";

  const shipRef = useRef<Web2Ship>(ship);

  const isValidShip = ship && ship.equipment && ship.traits && ship.shipData;

  const shipKey = useMemo(() => {
    if (!isValidShip) return "invalid";
    return getRenderedImageKey(ship);
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

  const isDestroyed = isValidShip && ship.shipData.timestampDestroyed > 0;
  const isNotConstructed = isValidShip && !ship.shipData.constructed;

  useEffect(() => {
    let cancelled = false;

    if (!isValidShip) {
      setImageState({ dataUrl: null, isLoading: false, error: "Invalid ship data structure" });
      return;
    }

    if (isNotConstructed || isDestroyed) {
      setImageState({ dataUrl: null, isLoading: false, error: null });
      return;
    }

    const currentShip = shipRef.current;

    const cachedImage = getCachedRenderedImage(currentShip);
    if (cachedImage) {
      setImageState({ dataUrl: cachedImage, isLoading: false, error: null });
      return;
    }

    getCachedShipData(currentShip.id);
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
        setImageState({ dataUrl, isLoading: false, error: null });
        setRenderKey((prev) => prev + 1);
      };
      testImg.onerror = () => {
        if (cancelled) return;
        setImageState({ dataUrl: null, isLoading: false, error: "Failed to generate valid image" });
      };
      testImg.src = dataUrl;
    } catch (error) {
      if (cancelled) return;
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog(`Error generating image for ship ${shipId}:`, errorMessage);
      setImageState({ dataUrl: null, isLoading: false, error: errorMessage });
    }

    return () => {
      cancelled = true;
    };
  }, [shipKey, shipId, isNotConstructed, isDestroyed, isValidShip]);

  return { ...imageState, renderKey };
}
