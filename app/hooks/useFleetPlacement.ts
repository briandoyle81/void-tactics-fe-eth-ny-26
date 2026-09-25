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
  /**
   * When set (e.g. a campaign's `campaignRequiredVariant`), only ships of
   * this variant are selectable at all — `Fleets.createFleet` now reverts
   * `MixedVariantFleet` otherwise, and some campaigns additionally require
   * a specific variant (`WrongCampaignVariant`). When unset, the fleet
   * locks to whichever variant the player picks first instead (still
   * single-variant, just not predetermined).
   */
  requiredVariant?: number;
  /**
   * This side's custom deployment-zone tiles for the map in play, from
   * `Maps.getCreatorZonePositions`/`getJoinerZonePositions` (see
   * docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md
   * §2) — pass the side-appropriate list (`isCreatorSide` picks which).
   * Empty/omitted means the map hasn't customized its zone, so this falls
   * back to the engine default column band exactly like before.
   */
  zoneTiles?: Array<{ row: number; col: number }>;
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
  requiredVariant,
  zoneTiles,
}: FleetPlacementParams) {
  const zone = isCreatorSide ? CREATOR_ZONE : JOINER_ZONE;
  const hasCustomZone = !!zoneTiles && zoneTiles.length > 0;

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
  // Set the first time the player explicitly places a ship (drag/click),
  // as opposed to it landing somewhere via addShip's auto-fill — replaces
  // an earlier "did anything leave the very first column" heuristic that
  // assumed a rectangular zone and broke for a custom zone shape.
  const [hasManuallyMoved, setHasManuallyMoved] = useState(false);

  // Creator fills its zone left-to-right, top-to-bottom; joiner fills its
  // zone right-to-left, bottom-to-top — mirrors Lobbies.tsx's original
  // per-side search order. A custom zone (non-rectangular) instead fills
  // in the order the contract returned its tiles.
  const findNextPosition = useCallback(
    (existingPositions: Array<{ row: number; col: number }>) => {
      if (hasCustomZone) {
        for (const tile of zoneTiles!) {
          if (!existingPositions.some((p) => p.row === tile.row && p.col === tile.col)) {
            return { row: tile.row, col: tile.col };
          }
        }
        return null;
      }
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
    [isCreatorSide, zone, hasCustomZone, zoneTiles],
  );

  // `Fleets.createFleet` reverts `MixedVariantFleet` if selected ships don't
  // all share one `traits.variant`; some campaigns additionally require a
  // specific variant (`campaignRequiredVariant`/`WrongCampaignVariant`).
  // `lockedVariant` is the single variant this fleet is currently
  // restricted to — either the caller-supplied requirement, or (once at
  // least one ship is picked) whichever variant that first ship is.
  const lockedVariant = useMemo(() => {
    if (requiredVariant != null && requiredVariant > 0) return requiredVariant;
    if (selectedShips.length === 0) return null;
    const firstShip = ships.find((s) => s.id === selectedShips[0]);
    return firstShip?.traits.variant ?? null;
  }, [requiredVariant, selectedShips, ships]);

  const addShip = useCallback(
    (shipId: bigint) => {
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

  const removeShip = useCallback((shipId: bigint) => {
    setSelectedShips((prev) => prev.filter((id) => id !== shipId));
    setShipPositions((prev) => prev.filter((p) => p.shipId !== shipId));
    setSelectedShipId((prev) => (prev === shipId ? null : prev));
  }, []);

  const moveShip = useCallback(
    (shipId: bigint, row: number, col: number) => {
      const inZone = hasCustomZone
        ? zoneTiles!.some((t) => t.row === row && t.col === col)
        : row >= 0 && row < GRID_DIMENSIONS.HEIGHT && col >= zone.colMin && col <= zone.colMax;
      if (!inZone) return;
      const occupied = shipPositions.some(
        (p) => p.row === row && p.col === col && p.shipId !== shipId,
      );
      if (occupied) return;

      setHasManuallyMoved(true);
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
    [shipPositions, selectedShips, zone, hasCustomZone, zoneTiles],
  );

  const clearSelection = useCallback(() => {
    setSelectedShips([]);
    setShipPositions([]);
    setSelectedShipId(null);
    setHasManuallyMoved(false);
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
        if (lockedVariant != null && ship.traits.variant !== lockedVariant) {
          return false;
        }

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
    [ships, fleetFilters, costsVersion, selectedShips, lockedVariant],
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

  // Require at least one explicit manual placement before allowing
  // submission — a UX nudge so a player doesn't submit a fleet they never
  // actually looked at, not an on-chain requirement.
  const hasMovedShip = shipPositions.length > 0 && hasManuallyMoved;

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
    maxShips: hasCustomZone ? zoneTiles!.length : MAX_SHIPS_PER_FLEET,
  };
}

export type FleetPlacement = ReturnType<typeof useFleetPlacement>;
