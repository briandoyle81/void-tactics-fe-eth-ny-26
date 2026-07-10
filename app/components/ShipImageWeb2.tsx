import React from "react";
import { useShipRendererWeb2 } from "../hooks/useShipRendererWeb2";
import { Web2Ship } from "../types/web2Ship";
import { calculateShipRank } from "../utils/shipLevel";
import { ShipImageView } from "./ShipImageView";

interface ShipImageWeb2Props {
  ship: Web2Ship;
  className?: string;
  showLoadingState?: boolean;
  style?: React.CSSProperties;
  rankStarsSize?: "default" | "large";
  hideRankStars?: boolean;
}

// Web2-mode adapter for the shared `ShipImageView` — resolves the REST-
// backed renderer hook and adapts `Web2Ship` (already number-native, no
// `toShipVisual()` conversion needed) to plain props. See `ShipImage.tsx`
// for the web3 counterpart; both render the identical `ShipImageView`.
export function ShipImageWeb2({
  ship,
  className = "",
  showLoadingState = true,
  style,
  rankStarsSize = "default",
  hideRankStars = false,
}: ShipImageWeb2Props) {
  const { dataUrl, isLoading, error } = useShipRendererWeb2(ship);

  return (
    <ShipImageView
      idLabel={`Ship #${ship.id}`}
      isDestroyed={ship.shipData.timestampDestroyed > 0}
      isNotConstructed={!ship.shipData.constructed}
      rank={calculateShipRank(ship).rank}
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
