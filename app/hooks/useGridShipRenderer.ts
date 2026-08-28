import { useState, useEffect, useRef, useMemo } from "react";
import { GridShip } from "../types/gridDisplay";
import { renderShip } from "../utils/shipRenderer";

// Shared rendering hook for the unified game grid — parametrized on
// `GridShip` (number id + `ShipVisual` fields) so it works for both web3
// (via `toGridShip` at the `GameDisplay` boundary) and web2 (whose native
// `Web2Ship` already matches) without needing a mode-specific cache the way
// `useShipRenderer`/`useShipRendererWeb2` do. Own lightweight in-memory
// cache only — no persistence layer, since the grid re-renders from live
// game state anyway.

const DEBUG_RENDERER = false;

function debugLog(...args: unknown[]) {
  if (DEBUG_RENDERER) {
    console.log(...args);
  }
}

const renderedImageCache = new Map<string, string>();
const MAX_RENDERED_CACHE_SIZE = 100;
const renderedImageAccessOrder: string[] = [];

function getRenderedImageKey(ship: GridShip): string {
  return `${ship.id}-${ship.traits.variant}-${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}-${ship.traits.accuracy}-${ship.traits.hull}-${ship.traits.speed}-${ship.traits.colors.h1}-${ship.traits.colors.s1}-${ship.traits.colors.l1}-${ship.shipData.shiny}-${ship.shipData.constructed}`;
}

function getCachedRenderedImage(ship: GridShip): string | null {
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

function cacheRenderedImage(ship: GridShip, dataUrl: string): void {
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

export function useGridShipRenderer(ship: GridShip): ShipImageState {
  const [imageState, setImageState] = useState<Omit<ShipImageState, "renderKey">>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });
  const [renderKey, setRenderKey] = useState(0);
  const shipId = ship?.id?.toString() || "unknown";

  const shipRef = useRef<GridShip>(ship);

  const isValidShip = ship && ship.equipment && ship.traits && ship.shipData;

  const shipKey = useMemo(() => {
    if (!isValidShip) return "invalid";
    return getRenderedImageKey(ship);
  }, [
    isValidShip,
    ship?.id,
    ship?.traits?.variant,
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
