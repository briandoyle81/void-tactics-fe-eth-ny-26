import React from "react";
import { useShipRendererWeb2 } from "../hooks/useShipRendererWeb2";
import { Web2Ship } from "../types/web2Ship";
import { calculateShipRank } from "../utils/shipLevel";
import { SHIP_IMAGE_RANK_STAR_BOX, SHIP_IMAGE_RANK_STAR_BOX_LARGE } from "./ShipImage";

// Web2-mode counterpart to `ShipImage.tsx` — identical presentation, backed
// by `useShipRendererWeb2` instead of the web3 renderer hook. `Web2Ship`
// satisfies the shared `ShipVisual` shape directly, so `calculateShipRank`
// (from `shipLevel.ts`) needs no adapter here, unlike the web3 side.

interface ShipImageWeb2Props {
  ship: Web2Ship;
  className?: string;
  showLoadingState?: boolean;
  style?: React.CSSProperties;
  rankStarsSize?: "default" | "large";
  hideRankStars?: boolean;
}

export function ShipImageWeb2({
  ship,
  className = "",
  showLoadingState = true,
  style,
  rankStarsSize = "default",
  hideRankStars = false,
}: ShipImageWeb2Props) {
  const { dataUrl, isLoading, error } = useShipRendererWeb2(ship);

  const rankStarBox =
    rankStarsSize === "large"
      ? SHIP_IMAGE_RANK_STAR_BOX_LARGE
      : SHIP_IMAGE_RANK_STAR_BOX;

  const isDestroyed = ship.shipData.timestampDestroyed > 0;
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

  if (isDestroyed) {
    return (
      <div
        className={`relative min-h-0 [container-type:size] ${className}`}
        style={style}
      >
        <img
          src="/img/ship-destroyed.png"
          alt={`Destroyed Ship #${ship.id}`}
          className="h-full w-full object-contain opacity-75"
        />
        {rankStarsOverlay}
      </div>
    );
  }

  if (isNotConstructed) {
    return (
      <div
        className={`relative min-h-0 [container-type:size] ${className}`}
        style={style}
      >
        <img
          src="/img/dry-dock.png"
          alt={`Unconstructed Ship #${ship.id}`}
          className="h-full w-full object-contain opacity-75"
        />
      </div>
    );
  }

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

  return (
    <div
      className={`relative min-h-0 [container-type:size] ${className}`}
      style={style}
    >
      <img
        src={dataUrl}
        alt={`Ship #${ship.id}`}
        className="h-full w-full object-contain"
        onError={(e) => {
          console.error("Failed to load ship image:", e);
        }}
      />
      {rankStarsOverlay}
    </div>
  );
}
