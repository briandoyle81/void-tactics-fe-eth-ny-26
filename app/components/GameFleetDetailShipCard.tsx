"use client";

import React from "react";
import ShipCard from "./ShipCard";
import type { ShipCardData } from "../types/shipCardData";
import type { Attributes } from "../types/types";

interface GameFleetDetailShipCardProps {
  shipId: string;
  ship: ShipCardData;
  shipImage: React.ReactNode;
  attributes: Attributes;
  isCurrentPlayerShip: boolean;
  flipShip: boolean;
  hasMoved: boolean;
  layoutShipId?: string;
  nameBlockMinHeightPx?: number;
  rowIndex?: number;
}

// Shared fleet-detail-modal ship card between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2). `rowIndex` is web3-only: when provided, the
// card is wrapped in the data-attribute cell web3's ship-name-height
// measurement effect scans for; web2 has no such effect and omits it.
export const GameFleetDetailShipCard: React.FC<GameFleetDetailShipCardProps> = ({
  shipId,
  ship,
  shipImage,
  attributes,
  isCurrentPlayerShip,
  flipShip,
  hasMoved,
  layoutShipId,
  nameBlockMinHeightPx,
  rowIndex,
}) => {
  const reactorCriticalStatus =
    attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0
      ? "critical"
      : attributes.reactorCriticalTimer > 0
        ? "warning"
        : "none";

  const card = (
    <ShipCard
      ship={ship}
      shipImage={shipImage}
      isStarred={false}
      onToggleStar={() => {}}
      isSelected={false}
      onToggleSelection={() => {}}
      onRecycleClick={() => {}}
      showInGameProperties={true}
      inGameAttributes={attributes}
      attributesLoading={false}
      hideRecycle={true}
      hideCheckbox={true}
      isCurrentPlayerShip={isCurrentPlayerShip}
      flipShip={flipShip}
      reactorCriticalStatus={reactorCriticalStatus}
      hasMoved={hasMoved}
      gameViewMode={true}
      layoutShipId={layoutShipId}
      nameBlockMinHeightPx={nameBlockMinHeightPx}
    />
  );

  if (rowIndex === undefined) return card;

  return (
    <div data-game-fleet-ship-cell="" data-ship-id={shipId} data-row-index={rowIndex}>
      {card}
    </div>
  );
};
