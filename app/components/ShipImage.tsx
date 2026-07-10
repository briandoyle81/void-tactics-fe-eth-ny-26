import React from "react";
import { useShipRenderer } from "../hooks/useShipRenderer";
import { Ship } from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";
import { toShipVisual } from "../utils/toShipVisual";
import { ShipImageView } from "./ShipImageView";

export {
  SHIP_IMAGE_RANK_STAR_BOX,
  SHIP_IMAGE_RANK_STAR_BOX_LARGE,
} from "./ShipImageView";

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

// Web3-mode adapter for the shared `ShipImageView` — resolves the on-chain
// renderer hook and adapts `Ship` (bigint) to plain props. See
// `ShipImageWeb2.tsx` for the web2 counterpart; both render the identical
// `ShipImageView`.
export function ShipImage({
  ship,
  className = "",
  showLoadingState = true,
  style,
  rankStarsSize = "default",
  hideRankStars = false,
}: ShipImageProps) {
  const { dataUrl, isLoading, error, renderKey } = useShipRenderer(ship);

  debugLog(
    `🖼️ ShipImage render for ship ${ship.id.toString()} (key: ${renderKey}):`,
    {
      dataUrl: dataUrl ? "present" : "null",
      isLoading,
      error,
      constructed: ship.shipData.constructed,
      destroyed: ship.shipData.timestampDestroyed > 0n,
    }
  );

  return (
    <ShipImageView
      idLabel={`Ship #${ship.id.toString()}`}
      isDestroyed={ship.shipData.timestampDestroyed > BigInt(0)}
      isNotConstructed={!ship.shipData.constructed}
      rank={calculateShipRank(toShipVisual(ship)).rank}
      dataUrl={dataUrl}
      isLoading={isLoading}
      error={error}
      className={className}
      showLoadingState={showLoadingState}
      style={style}
      rankStarsSize={rankStarsSize}
      hideRankStars={hideRankStars}
    />
  );
}
