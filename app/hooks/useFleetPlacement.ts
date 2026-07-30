"use client";

import { useCallback, useMemo, useState } from "react";
import { GRID_DIMENSIONS, Ship } from "../types/types";
import {
  type FleetFilters,
  DEFAULT_FLEET_FILTERS,
  matchesFleetFilters,
} from "../utils/fleetFilters";
import { MAX_SHIPS_PER_FLEET } from "../utils/lobbyFormatters";

export interface FleetPlacementParams {
  ships: Ship[];
  costLimit: number;
  /** Global ship-attributes costs version, or null if not yet known (skips the staleness check). */
  costsVersion: number | null;
  /** Creator deploys cols 0-3 (search left-to-right); joiner deploys cols 13-16 (search right-to-left). Single-player is always the creator side. */
  isCreatorSide: boolean;
}

const CREATOR_ZONE = { colMin: 0, colMax: 3 } as const;
const JOINER_ZONE = { colMin: 13, colMax: 16 } as const;

// Shared ship-picking state/handlers for any "build a fleet on a grid" flow
// — PvP lobby creation (either side) and single-player node matches alike.
// Previously PvP (Lobbies.tsx) and single-player (useNodeFleetSelection.ts)
// each had their own copy of this logic; a chain-scoping fix landing in one
// and not the other is exactly the kind of drift a single shared
// implementation prevents. See feedback_no_parallel_components memory.
export function useFleetPlacement({
  ships,
  costLimit,
  costsVersion,
  isCreatorSide,
}: FleetPlacementParams) {
  const zone = isCreatorSide ? CREATOR_ZONE : JOINER_ZONE;

  const [selectedShips, setSelectedShips] = useState<bigint[]>([]);
  const [shipPositions, setShipPositions] = useState<
    Array<{ shipId: bigint; row: number; col: number }>
  >([]);
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [fleetFilters, setFleetFilters] = useState<FleetFilters>(DEFAULT_FLEET_FILTERS);
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    { row: number; col: number } | null
  >(null);

  // Creator fills its zone left-to-right, top-to-bottom; joiner fills its
  // zone right-to-left, bottom-to-top — mirrors Lobbies.tsx's original
  // per-side search order.
  const findNextPosition = useCallback(
    (existingPositions: Array<{ row: number; col: number }>) => {
      if (isCreatorSide) {
        for (let col = zone.colMin; col <= zone.colMax; col++) {
          for (let row = 0; row < GRID_DIMENSIONS.HEIGHT; row++) {
            if (!existingPositions.some((p) => p.row === row && p.col === col)) {
              return { row, col };
            }
          }
        }
      } else {
        for (let col = zone.colMax; col >= zone.colMin; col--) {
          for (let row = GRID_DIMENSIONS.HEIGHT - 1; row >= 0; row--) {
            if (!existingPositions.some((p) => p.row === row && p.col === col)) {
              return { row, col };
            }
          }
        }
      }
      return null;
    },
    [isCreatorSide, zone],
  );

  const addShip = useCallback(
    (shipId: bigint) => {
      const position = findNextPosition(shipPositions);
      if (!position) return;
      setSelectedShips((prev) => [...prev, shipId]);
      setShipPositions((prev) => [
        ...prev,
        { shipId, row: position.row, col: position.col },
      ]);
    },
    [shipPositions, findNextPosition],
  );

  const removeShip = useCallback((shipId: bigint) => {
    setSelectedShips((prev) => prev.filter((id) => id !== shipId));
    setShipPositions((prev) => prev.filter((p) => p.shipId !== shipId));
    setSelectedShipId((prev) => (prev === shipId ? null : prev));
  }, []);

  const moveShip = useCallback(
    (shipId: bigint, row: number, col: number) => {
      const inZone =
        row >= 0 &&
        row < GRID_DIMENSIONS.HEIGHT &&
        col >= zone.colMin &&
        col <= zone.colMax;
      if (!inZone) return;
      const occupied = shipPositions.some(
        (p) => p.row === row && p.col === col && p.shipId !== shipId,
      );
      if (occupied) return;

      if (!selectedShips.includes(shipId)) {
        setSelectedShips((prev) => [...prev, shipId]);
        setShipPositions((prev) => [...prev, { shipId, row, col }]);
        return;
      }
      setShipPositions((prev) =>
        prev.map((p) => (p.shipId === shipId ? { ...p, row, col } : p)),
      );
      setSelectedShipId(null);
    },
    [shipPositions, selectedShips, zone],
  );

  const clearSelection = useCallback(() => {
    setSelectedShips([]);
    setShipPositions([]);
    setSelectedShipId(null);
  }, []);

  const resolveShip = useCallback(
    (shipId: bigint): Ship | undefined => ships.find((s) => s.id === shipId),
    [ships],
  );

  const filteredShips = useMemo(
    () =>
      ships.filter((ship) => {
        const costsVersionOk =
          costsVersion === null ||
          Number(ship.shipData.costsVersion) === costsVersion;

        if (selectedShips.includes(ship.id)) return costsVersionOk;
        if (!costsVersionOk) return false;

        return matchesFleetFilters(
          {
            cost: Number(ship.shipData.cost),
            isShiny: ship.shipData.shiny,
            accuracy: ship.traits.accuracy,
            hull: ship.traits.hull,
            speed: ship.traits.speed,
            isConstructed: ship.shipData.constructed,
            isDestroyed: ship.shipData.timestampDestroyed > 0n,
            inFleet: ship.shipData.inFleet,
            mainWeapon: ship.equipment.mainWeapon,
            shields: ship.equipment.shields,
            special: ship.equipment.special,
          },
          fleetFilters,
        );
      }),
    [ships, fleetFilters, costsVersion, selectedShips],
  );

  const hasStaleCostsVersion = useMemo(() => {
    if (costsVersion === null) return false;
    return selectedShips.some((id) => {
      const ship = resolveShip(id);
      return !ship || Number(ship.shipData.costsVersion) !== costsVersion;
    });
  }, [costsVersion, selectedShips, resolveShip]);

  const totalCost = useMemo(
    () =>
      selectedShips.reduce((sum, shipId) => {
        const ship = resolveShip(shipId);
        return sum + (ship ? Number(ship.shipData.cost) : 0);
      }, 0),
    [selectedShips, resolveShip],
  );
  const isOverLimit = totalCost > costLimit;
  const isUnder90Percent = totalCost < costLimit * 0.9;

  // Require at least one ship moved off the default deploy column (creator:
  // col 0, joiner: the far column) before allowing submission — mirrors
  // Fleets.createFleet's own expectations for a side's fleet.
  const defaultCol = isCreatorSide ? 0 : GRID_DIMENSIONS.WIDTH - 1;
  const hasMovedShip =
    shipPositions.length > 0 && shipPositions.some((pos) => pos.col !== defaultCol);

  return {
    ships,
    selectedShips,
    setSelectedShips,
    shipPositions,
    setShipPositions,
    selectedShipId,
    setSelectedShipId,
    fleetFilters,
    setFleetFilters,
    draggedShipId,
    setDraggedShipId,
    dragOverPosition,
    setDragOverPosition,
    addShip,
    removeShip,
    moveShip,
    findNextPosition,
    clearSelection,
    filteredShips,
    totalCost,
    isOverLimit,
    isUnder90Percent,
    hasMovedShip,
    hasStaleCostsVersion,
    maxShips: MAX_SHIPS_PER_FLEET,
  };
}

export type FleetPlacement = ReturnType<typeof useFleetPlacement>;
