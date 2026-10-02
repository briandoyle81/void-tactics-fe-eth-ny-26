"use client";

import React from "react";
import { GameFleetCard } from "./GameFleetCard";
import type { Attributes } from "../types/types";
import { useGridHoveredCell, useSetGridHoveredCell } from "./GridHover";

interface GameFleetStatusCardProps {
  shipId: number;
  shipName: string;
  attributes: Attributes | null;
  hasMoved: boolean;
  teamColor: string;
  flip: boolean;
  isSelected: boolean;
  isHovered?: boolean;
  optimisticSos?: boolean;
  shipImage: React.ReactNode;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  fleetHoverAnchor?: { row: number; col: number; isCreator: boolean } | null;
}

const GameFleetStatusCardView = React.memo(function GameFleetStatusCardView({
  shipId,
  shipName,
  attributes,
  hasMoved,
  teamColor,
  flip,
  isSelected,
  isHovered,
  optimisticSos = false,
  shipImage,
  onClick,
  onMouseEnter,
  onMouseLeave,
  fleetHoverAnchor,
}: GameFleetStatusCardProps & { isHovered: boolean }) {
  const setHoveredCell = useSetGridHoveredCell();
  const handleMouseEnter =
    onMouseEnter ??
    (fleetHoverAnchor
      ? () =>
          setHoveredCell({
            shipId,
            row: fleetHoverAnchor.row,
            col: fleetHoverAnchor.col,
            isCreator: fleetHoverAnchor.isCreator,
            fromFleet: true,
          })
      : undefined);
  const handleMouseLeave =
    onMouseLeave ?? (fleetHoverAnchor ? () => setHoveredCell(null) : undefined);
  const isSOS =
    optimisticSos || (!!attributes && attributes.hullPoints === 0);
  const hpPct =
    optimisticSos
      ? 0
      : attributes && attributes.maxHullPoints > 0
        ? Math.max(0, (attributes.hullPoints / attributes.maxHullPoints) * 100)
        : 0;

  return (
    <GameFleetCard
      card={{ shipId, name: shipName, hpPct, hasMoved, isSOS }}
      teamColor={teamColor}
      flip={flip}
      isSelected={isSelected}
      isHovered={isHovered}
      shipImage={shipImage}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
});

function GameFleetStatusCardFromContext(props: GameFleetStatusCardProps) {
  const hoveredCell = useGridHoveredCell();
  return (
    <GameFleetStatusCardView
      {...props}
      isHovered={hoveredCell?.shipId === props.shipId}
    />
  );
}

// Shared fleet-status-panel ship card between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — derives the SOS/hull-percent display fields
// from Attributes and wires them into GameFleetCard.
export function GameFleetStatusCard(props: GameFleetStatusCardProps) {
  if (props.isHovered !== undefined) {
    return <GameFleetStatusCardView {...props} isHovered={props.isHovered} />;
  }
  return <GameFleetStatusCardFromContext {...props} />;
}
