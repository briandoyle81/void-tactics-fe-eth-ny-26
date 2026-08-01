"use client";

import React from "react";
import { GRID_DIMENSIONS, Ship } from "../types/types";
import {
  useGetPresetMap,
  useGetPresetScoringMap,
} from "../hooks/useMapsContract";
import { ShipImage } from "./ShipImage";
import { toShipCardData } from "../utils/toShipCardData";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { calculateAttributesFromContracts } from "../utils/shipAttributesCalculator";
import { MapDisplayView } from "./MapDisplayView";
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
import type { ShipCardData } from "../types/shipCardData";
import type { Attributes } from "../types/types";

// Thin web3 adapter over the shared, string-native `MapDisplayView` — see
// that file for the actual rendering/interaction logic. Keeps this
// component's bigint-based public prop interface unchanged. Used by
// Lobbies.tsx's fleet-selection modal (real ships only, both sides) and
// NodeMatchModal.tsx's deployment map (real player ships + synthetic
// enemy-preview ships — see the shipIds filter below for why that mix
// matters).
interface MapDisplayProps {
  mapId: number;
  className?: string;
  showPlayerOverlay?: boolean;
  isCreator?: boolean; // kept for backward compatibility (flips all)
  isCreatorViewer?: boolean; // determines placement validity
  shipPositions?: Array<{ shipId: bigint; row: number; col: number }>;
  ships?: Array<Ship | { id: bigint; name: string; imageUrl?: string }>;
  selectedShipId?: bigint | null;
  onShipSelect?: (shipId: bigint) => void;
  onShipMove?: (shipId: bigint, row: number, col: number) => void;
  allowSelection?: boolean;
  selectableShipIds?: bigint[]; // which ships are allowed to be selected
  flippedShipIds?: bigint[]; // specific ships to flip horizontally
  onDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onDrop?: (row: number, col: number, e?: React.DragEvent) => void;
  dragOverPosition?: { row: number; col: number } | null;
  showDeployZoneLabel?: boolean;
  pendingPlacementShipId?: bigint | null;
}

export function MapDisplay({
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
}: MapDisplayProps) {
  const { data: blockedPositions } = useGetPresetMap(mapId);
  const { data: scoringPositions } = useGetPresetScoringMap(mapId);

  const grids = React.useMemo(
    () =>
      buildMapGridsFromContractMap(
        Array.isArray(blockedPositions) ? blockedPositions : undefined,
        Array.isArray(scoringPositions) ? scoringPositions : undefined,
        GRID_DIMENSIONS.WIDTH,
        GRID_DIMENSIONS.HEIGHT,
      ),
    [blockedPositions, scoringPositions],
  );

  // Full Ship objects (not simple {id, name} stand-ins) for card data/attributes
  const fullShips = React.useMemo(
    () => ships.filter((ship): ship is Ship => "equipment" in ship),
    [ships],
  );
  const shipByStringId = React.useMemo(() => {
    const map = new Map<string, Ship>();
    fullShips.forEach((ship) => map.set(ship.id.toString(), ship));
    return map;
  }, [fullShips]);

  const shipCardDataMap = React.useMemo(() => {
    const map = new Map<string, ShipCardData>();
    fullShips.forEach((ship) => map.set(ship.id.toString(), toShipCardData(ship)));
    return map;
  }, [fullShips]);

  const shipNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    ships.forEach((ship) => map.set(ship.id.toString(), ship.name));
    return map;
  }, [ships]);

  const getShipArt = React.useCallback(
    (id: string) => {
      const ship = shipByStringId.get(id);
      return ship ? <ShipImage ship={ship} className="h-full w-full" /> : null;
    },
    [shipByStringId],
  );

  // Enemy-fleet preview ships (NodeMatchModal's pre-launch deployment map)
  // are synthetic — aiConfigToPreviewShip gives them a fake id and a zero
  // owner address, since no real on-chain ship exists until the match
  // actually starts. Mixing a fake id into this one batched
  // calculateShipAttributesByIds call reverts the whole call, so exclude
  // anything without a real owner rather than let it blank out attributes
  // for every ship on the board, including the player's own real ones.
  const shipIds = React.useMemo(
    () =>
      fullShips
        .filter((ship) => ship.owner !== "0x0000000000000000000000000000000000000000")
        .map((ship) => ship.id),
    [fullShips],
  );
  const { attributes, isLoading: attributesLoading } = useShipAttributesByIds(shipIds);
  const attributesMap = React.useMemo(() => {
    const map = new Map<string, Attributes>();
    // Index-aligned with shipIds (the filtered query), not fullShips —
    // attributes[i] corresponds to shipIds[i], and those two arrays only
    // match fullShips 1:1 when nothing was filtered out above.
    shipIds.forEach((shipId, index) => {
      if (attributes[index]) {
        map.set(shipId.toString(), attributes[index]);
      }
    });
    // Synthetic preview ships (excluded from the contract query above, no
    // real on-chain data to fetch) still have real equipment/traits baked
    // in — compute their attributes the same way SimulatedGameDisplay/
    // tutorial ships do, client-side, so their tooltips show real numbers
    // instead of nothing. Scoped to the zero-owner check specifically
    // (not "missing from map for any reason") so a real ship whose fetch
    // hasn't resolved yet still correctly reads as loading, not silently
    // swapped for a locally-approximated value.
    fullShips.forEach((ship) => {
      if (
        ship.owner === "0x0000000000000000000000000000000000000000" &&
        !map.has(ship.id.toString())
      ) {
        map.set(ship.id.toString(), calculateAttributesFromContracts(ship));
      }
    });
    return map;
  }, [shipIds, attributes, fullShips]);

  const stringShipPositions = React.useMemo(
    () => shipPositions.map((pos) => ({ shipId: pos.shipId.toString(), row: pos.row, col: pos.col })),
    [shipPositions],
  );

  const handleShipSelect = React.useCallback(
    (id: string) => onShipSelect?.(BigInt(id)),
    [onShipSelect],
  );
  const handleShipMove = React.useCallback(
    (id: string, row: number, col: number) => onShipMove?.(BigInt(id), row, col),
    [onShipMove],
  );

  return (
    <MapDisplayView
      mapId={mapId}
      className={className}
      blockedGrid={grids.blockedGrid}
      scoringGrid={grids.scoringGrid}
      onlyOnceGrid={grids.onlyOnceGrid}
      showPlayerOverlay={showPlayerOverlay}
      isCreator={isCreator}
      isCreatorViewer={isCreatorViewer}
      shipPositions={stringShipPositions}
      shipCardDataMap={shipCardDataMap}
      shipNameMap={shipNameMap}
      getShipArt={getShipArt}
      selectedShipId={selectedShipId?.toString() ?? null}
      onShipSelect={onShipSelect ? handleShipSelect : undefined}
      onShipMove={onShipMove ? handleShipMove : undefined}
      allowSelection={allowSelection}
      selectableShipIds={selectableShipIds?.map((id) => id.toString())}
      flippedShipIds={flippedShipIds.map((id) => id.toString())}
      onDragOver={onDragOver}
      onDrop={onDrop}
      dragOverPosition={dragOverPosition}
      showDeployZoneLabel={showDeployZoneLabel}
      pendingPlacementShipId={pendingPlacementShipId?.toString() ?? null}
      attributesMap={attributesMap}
      attributesLoading={attributesLoading}
      showTooltipInGameProperties={true}
    />
  );
}
