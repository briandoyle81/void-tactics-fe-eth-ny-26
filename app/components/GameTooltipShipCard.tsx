"use client";

import React from "react";
import ShipCard from "./ShipCard";
import type { ShipCardData } from "../types/shipCardData";
import type { Attributes } from "../types/types";

interface GameTooltipShipCardProps {
  ship: ShipCardData;
  shipImage: React.ReactNode;
  attributes: Attributes | undefined;
  isCurrentPlayerShip: boolean;
  flipShip: boolean;
  hasMoved: boolean;
  gridPosition: { row: number; col: number };
}

// Shared grid-hover tooltip ship card between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — same static ShipCard prop wiring in both
// files' renderShipCard callbacks.
export const GameTooltipShipCard: React.FC<GameTooltipShipCardProps> = ({
  ship,
  shipImage,
  attributes,
  isCurrentPlayerShip,
  flipShip,
  hasMoved,
  gridPosition,
}) => (
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
    attributesLoading={!attributes}
    hideRecycle={true}
    hideCheckbox={true}
    tooltipMode={true}
    isCurrentPlayerShip={isCurrentPlayerShip}
    flipShip={flipShip}
    hasMoved={hasMoved}
    gameViewMode={true}
    tooltipGridPosition={gridPosition}
  />
);
