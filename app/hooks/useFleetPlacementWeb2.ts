"use client";

import { useCallback, useMemo, useState } from "react";
import { GRID_DIMENSIONS } from "../types/types";
import type { Web2Ship } from "../types/web2Ship";
import {
  type FleetFilters,
  DEFAULT_FLEET_FILTERS,
  matchesFleetFilters,
} from "../utils/fleetFilters";
import { MAX_SHIPS_PER_FLEET } from "../utils/lobbyFormatters";

export interface FleetPlacementWeb2Params {
  ships: Web2Ship[];
  costLimit: number;
  costsVersion: number | null;
  isCreatorSide: boolean;
  requiredVariant?: number;
}

const CREATOR_ZONE = { colMin: 0, colMax: 3 } as const;
const JOINER_ZONE = { colMin: 13, colMax: 16 } as const;

// Web2 counterpart to useFleetPlacement.ts — same shared ship-picking
// state/handlers, number-native (Web2Ship ids are plain numbers) instead
// of bigint-native. Field-for-field port; keep the two in sync if either
// changes (see feedback_web2_web3_parity_mandate memory — this hook itself
// is a legitimate data-source-driven twin like useGamePolling/
// useGamePollingWeb2, but every UI piece it feeds — FleetSelectionModal,
// MapDisplayWeb2, ShipCard — must stay the real shared component).
export function useFleetPlacementWeb2({
  ships,
  costLimit,
  costsVersion,
  isCreatorSide,
  requiredVariant,
}: FleetPlacementWeb2Params) {
  const zone = isCreatorSide ? CREATOR_ZONE : JOINER_ZONE;

  const [selectedShips, setSelectedShips] = useState<number[]>([]);
  const [shipPositions, setShipPositions] = useState<
    Array<{ shipId: number; row: number; col: number }>
  >([]);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [fleetFilters, setFleetFilters] = useState<FleetFilters>(DEFAULT_FLEET_FILTERS);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    { row: number; col: number } | null
  >(null);

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

  const lockedVariant = useMemo(() => {
    if (requiredVariant != null && requiredVariant > 0) return requiredVariant;
    if (selectedShips.length === 0) return null;
    const firstShip = ships.find((s) => s.id === selectedShips[0]);
    return firstShip?.traits.variant ?? null;
  }, [requiredVariant, selectedShips, ships]);

  const addShip = useCallback(
    (shipId: number) => {
      const ship = ships.find((s) => s.id === shipId);
      if (lockedVariant != null && ship && ship.traits.variant !== lockedVariant) {
        return;
      }
      const position = findNextPosition(shipPositions);
      if (!position) return;
      setSelectedShips((prev) => [...prev, shipId]);
      setShipPositions((prev) => [
        ...prev,
        { shipId, row: position.row, col: position.col },
      ]);
    },
    [shipPositions, findNextPosition, ships, lockedVariant],
  );

  const removeShip = useCallback((shipId: number) => {
    setSelectedShips((prev) => prev.filter((id) => id !== shipId));
    setShipPositions((prev) => prev.filter((p) => p.shipId !== shipId));
    setSelectedShipId((prev) => (prev === shipId ? null : prev));
  }, []);

  const moveShip = useCallback(
    (shipId: number, row: number, col: number) => {
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
    (shipId: number): Web2Ship | undefined => ships.find((s) => s.id === shipId),
    [ships],
  );

  const filteredShips = useMemo(
    () =>
      ships.filter((ship) => {
        const costsVersionOk =
          costsVersion === null || ship.shipData.costsVersion === costsVersion;

        if (selectedShips.includes(ship.id)) return costsVersionOk;
        if (!costsVersionOk) return false;
        if (lockedVariant != null && ship.traits.variant !== lockedVariant) {
          return false;
        }

        return matchesFleetFilters(
          {
            cost: ship.shipData.cost,
            isShiny: ship.shipData.shiny,
            accuracy: ship.traits.accuracy,
            hull: ship.traits.hull,
            speed: ship.traits.speed,
            isConstructed: ship.shipData.constructed,
            isDestroyed: ship.shipData.timestampDestroyed > 0,
            inFleet: ship.shipData.inFleet,
            mainWeapon: ship.equipment.mainWeapon,
            shields: ship.equipment.shields,
            special: ship.equipment.special,
          },
          fleetFilters,
        );
      }),
    [ships, fleetFilters, costsVersion, selectedShips, lockedVariant],
  );

  const hasStaleCostsVersion = useMemo(() => {
    if (costsVersion === null) return false;
    return selectedShips.some((id) => {
      const ship = resolveShip(id);
      return !ship || ship.shipData.costsVersion !== costsVersion;
    });
  }, [costsVersion, selectedShips, resolveShip]);

  const totalCost = useMemo(
    () =>
      selectedShips.reduce((sum, shipId) => {
        const ship = resolveShip(shipId);
        return sum + (ship ? ship.shipData.cost : 0);
      }, 0),
    [selectedShips, resolveShip],
  );
  const isOverLimit = totalCost > costLimit;
  const isUnder90Percent = totalCost < costLimit * 0.9;

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
    lockedVariant,
    totalCost,
    isOverLimit,
    isUnder90Percent,
    hasMovedShip,
    hasStaleCostsVersion,
    maxShips: MAX_SHIPS_PER_FLEET,
  };
}

export type FleetPlacementWeb2 = ReturnType<typeof useFleetPlacementWeb2>;
