"use client";

import React from "react";
import { GameFleetCard } from "./GameFleetCard";
import type { Attributes } from "../types/types";

interface GameFleetStatusCardProps {
  shipId: number;
  shipName: string;
  attributes: Attributes | null;
  hasMoved: boolean;
  teamColor: string;
  flip: boolean;
  isSelected: boolean;
  isHovered: boolean;
  shipImage: React.ReactNode;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// Shared fleet-status-panel ship card between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — derives the SOS/hull-percent display fields
// from Attributes and wires them into GameFleetCard.
export const GameFleetStatusCard: React.FC<GameFleetStatusCardProps> = ({
  shipId,
  shipName,
  attributes,
  hasMoved,
  teamColor,
  flip,
  isSelected,
  isHovered,
  shipImage,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isSOS = !!attributes && attributes.hullPoints === 0;
  const hpPct =
    attributes && attributes.maxHullPoints > 0
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
