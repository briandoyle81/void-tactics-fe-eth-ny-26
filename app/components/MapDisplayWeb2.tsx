"use client";

import React from "react";
import { GRID_DIMENSIONS } from "../types/types";
import { Web2Ship } from "../types/web2Ship";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { useMapWeb2 } from "../hooks/useMapWeb2";
import { MapDisplayView } from "./MapDisplayView";
import type { ShipCardData } from "../types/shipCardData";

// Thin web2 adapter over the shared, string-native `MapDisplayView` — see
// that file for the actual rendering/interaction logic, and `MapDisplay.tsx`
// for the web3 counterpart. Number-native public props (Web2Ship ids are
// plain numbers), converted to strings only at the `MapDisplayView` call.
interface MapDisplayWeb2Props {
  mapId: number;
  className?: string;
  showPlayerOverlay?: boolean;
  isCreator?: boolean;
  isCreatorViewer?: boolean;
  shipPositions?: Array<{ shipId: number; row: number; col: number }>;
  ships?: Web2Ship[];
  selectedShipId?: number | null;
  onShipSelect?: (shipId: number) => void;
  onShipMove?: (shipId: number, row: number, col: number) => void;
  allowSelection?: boolean;
  selectableShipIds?: number[];
  flippedShipIds?: number[];
  onDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onDrop?: (row: number, col: number, e?: React.DragEvent) => void;
  dragOverPosition?: { row: number; col: number } | null;
  showDeployZoneLabel?: boolean;
  pendingPlacementShipId?: number | null;
}

export function MapDisplayWeb2({
  mapId,
  className = "",
  showPlayerOverlay = false,
  isCreator = false,
  isCreatorViewer = false,
  shipPositions = [],
  ships = [],
  selectedShipId = null,
  onShipSelect,
  onShipMove,
  allowSelection = true,
  selectableShipIds,
  flippedShipIds = [],
  onDragOver,
  onDrop,
  dragOverPosition = null,
  showDeployZoneLabel = false,
  pendingPlacementShipId = null,
}: MapDisplayWeb2Props) {
  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMapWeb2(
    mapId,
    GRID_DIMENSIONS.WIDTH,
    GRID_DIMENSIONS.HEIGHT,
  );

  const shipByStringId = React.useMemo(() => {
    const map = new Map<string, Web2Ship>();
    ships.forEach((ship) => map.set(String(ship.id), ship));
    return map;
  }, [ships]);

  const shipCardDataMap = React.useMemo(() => {
    const map = new Map<string, ShipCardData>();
    ships.forEach((ship) => map.set(String(ship.id), toShipCardDataWeb2(ship)));
    return map;
  }, [ships]);

  const getShipArt = React.useCallback(
    (id: string) => {
      const ship = shipByStringId.get(id);
      return ship ? <ShipImageWeb2 ship={ship} className="h-full w-full" /> : null;
    },
    [shipByStringId],
  );

  const stringShipPositions = React.useMemo(
    () => shipPositions.map((pos) => ({ shipId: String(pos.shipId), row: pos.row, col: pos.col })),
    [shipPositions],
  );

  const handleShipSelect = React.useCallback(
    (id: string) => onShipSelect?.(Number(id)),
    [onShipSelect],
  );
  const handleShipMove = React.useCallback(
    (id: string, row: number, col: number) => onShipMove?.(Number(id), row, col),
    [onShipMove],
  );

  return (
    <MapDisplayView
      mapId={mapId}
      className={className}
      blockedGrid={blockedGrid}
      scoringGrid={scoringGrid}
      onlyOnceGrid={onlyOnceGrid}
      showPlayerOverlay={showPlayerOverlay}
      isCreator={isCreator}
      isCreatorViewer={isCreatorViewer}
      shipPositions={stringShipPositions}
      shipCardDataMap={shipCardDataMap}
      getShipArt={getShipArt}
      selectedShipId={selectedShipId !== null ? String(selectedShipId) : null}
      onShipSelect={onShipSelect ? handleShipSelect : undefined}
      onShipMove={onShipMove ? handleShipMove : undefined}
      allowSelection={allowSelection}
      selectableShipIds={selectableShipIds?.map((id) => String(id))}
      flippedShipIds={flippedShipIds.map((id) => String(id))}
      onDragOver={onDragOver}
      onDrop={onDrop}
      dragOverPosition={dragOverPosition}
      showDeployZoneLabel={showDeployZoneLabel}
      pendingPlacementShipId={pendingPlacementShipId !== null ? String(pendingPlacementShipId) : null}
      showTooltipInGameProperties={false}
    />
  );
}
