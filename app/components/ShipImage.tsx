import React from "react";
import { useShipRenderer } from "../hooks/useShipRenderer";
import { Ship } from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";

/** Rank ⭐ overlay size; reactor skull discs on cards use the same em box. */
export const SHIP_IMAGE_RANK_STAR_BOX =
  "clamp(0.4375rem, 13cqmin, 1.625rem)" as const;

/** Bigger ⭐ for large pack previews (e.g. 256×256); ~2× prior large tier vs `SHIP_IMAGE_RANK_STAR_BOX`. */
export const SHIP_IMAGE_RANK_STAR_BOX_LARGE =
  "clamp(1.125rem, 28cqmin, 5rem)" as const;

// Debug flag - set to false to disable console logs
const DEBUG_IMAGES = false;

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_IMAGES) {
    console.log(...args);
  }
}

interface ShipImageProps {
  ship: Ship;
  className?: string;
  showLoadingState?: boolean;
  style?: React.CSSProperties;
  /** Use on large preview tiles only (e.g. pack hero `h-64`); keep default on small thumbnails. */
  rankStarsSize?: "default" | "large";
  /** Game grid draws rank stars below the team dot; hide here to avoid overlap with mirrored art. */
  hideRankStars?: boolean;
}

export function ShipImage({
  ship,
  className = "",
  showLoadingState = true,
  style,
  rankStarsSize = "default",
  hideRankStars = false,
}: ShipImageProps) {
  const { dataUrl, isLoading, error, renderKey } = useShipRenderer(ship);

  const rankStarBox =
    rankStarsSize === "large"
      ? SHIP_IMAGE_RANK_STAR_BOX_LARGE
      : SHIP_IMAGE_RANK_STAR_BOX;

  // Debug logging
  debugLog(
    `🖼️ ShipImage render for ship ${ship.id.toString()} (key: ${renderKey}):`,
    {
      dataUrl: dataUrl ? "present" : "null",
      isLoading,
      error,
      constructed: ship.shipData.constructed,
      destroyed: ship.shipData.timestampDestroyed > 0,
    }
  );

  // Check ship state
  const isDestroyed = ship.shipData.timestampDestroyed > Number(0);
  const isNotConstructed = !ship.shipData.constructed;

  const rankStarsOverlay =
    ship.shipData.constructed && !hideRankStars ? (
      <div
        className="pointer-events-none absolute right-[2.5%] top-[5%] z-10 leading-none text-amber"
        style={{
          fontSize: rankStarBox,
        }}
      >
        {Array.from({ length: calculateShipRank(ship).rank }, (_, i) => (
          <span key={i}>⭐</span>
        ))}
      </div>
    ) : null;

  // Handle destroyed ships
  if (isDestroyed) {
    return (
      <div
        className={`relative min-h-0 [container-type:size] ${className}`}
        style={style}
      >
        <img
          src="/img/ship-destroyed.png"
          alt={`Destroyed Ship #${ship.id.toString()}`}
          className="h-full w-full object-contain opacity-75"
        />
        {rankStarsOverlay}
      </div>
    );
  }

  // Handle not constructed ships
  if (isNotConstructed) {
    return (
      <div
        className={`relative min-h-0 [container-type:size] ${className}`}
        style={style}
      >
        <img
          src="/img/dry-dock.png"
          alt={`Unconstructed Ship #${ship.id.toString()}`}
          className="h-full w-full object-contain opacity-75"
        />
      </div>
    );
  }

  // Handle loading state for constructed ships (including retries)
  // Only show loading if we don't have dataUrl (to prevent flash when re-rendering)
  if (isLoading && showLoadingState && !dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-steel/50 border border-gunmetal rounded-none ${className}`}
      >
        <div className="text-text-muted text-xs text-center p-2 font-mono tracking-widest animate-pulse">
          &gt;&gt;
          {error && <div className="text-amber text-xs mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  // Handle error or no data for constructed ships - keep showing loading instead of fallback
  // Only show loading if we don't have dataUrl (to prevent flash when re-rendering)
  if ((error || !dataUrl) && !dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-steel/50 border border-gunmetal rounded-none ${className}`}
      >
        <div className="text-text-muted text-xs text-center p-2 font-mono tracking-widest animate-pulse">
          &gt;&gt;
          {error && <div className="text-amber text-xs mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  // Normal constructed ship with image
  return (
    <div
      className={`relative min-h-0 [container-type:size] ${className}`}
      style={style}
    >
      <img
        src={dataUrl}
        alt={`Ship #${ship.id.toString()}`}
        className="h-full w-full object-contain"
        onError={(e) => {
          console.error("Failed to load ship image:", e);
          // The error will be handled by the hook's error state
        }}
      />
      {rankStarsOverlay}
    </div>
  );
}
