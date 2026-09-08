"use client";

import type { Attributes, Ship } from "../types/types";
import ShipCard from "../components/ShipCard";
import { ShipImage } from "../components/ShipImage";
import { toShipCardData } from "../utils/toShipCardData";
import type { FleetShipListItemData } from "../components/FleetShipListPanel";

export interface BuildFleetShipListItemsParams {
  ships: Ship[];
  selectedShips: bigint[];
  addShip: (shipId: bigint) => void;
  removeShip: (shipId: bigint) => void;
  setDraggedShipId: (shipId: bigint | null) => void;
  setDragOverPosition: (pos: { row: number; col: number } | null) => void;
  attributesMap: Map<bigint, Attributes>;
  attributesLoading: boolean;
  showInGameProperties: boolean;
  flipShips: boolean;
  // Touch tap-to-place is optional — flows that don't wire it just get
  // plain click-to-toggle behavior (isPending always false).
  tapPendingShipId?: bigint | null;
  setTapPendingShipId?: (id: bigint | null) => void;
  isTouchDevice?: boolean;
}

// Builds the ship-card list for a fleet-selection panel (sorted with
// selected ships first, each wired for click-to-toggle/drag/touch-tap) —
// previously duplicated almost verbatim between Lobbies.tsx and
// NodeMatchModal.tsx. See feedback_no_parallel_components memory: this is
// the actual component-composition layer that hook-sharing alone
// (useFleetPlacement) didn't cover.
//
// Deliberately a plain function, not a hook — Lobbies.tsx builds its ship
// list inside a conditionally-invoked render closure (`selectedLobby && (()
// => {...})()`), where calling a hook (even indirectly, via an internal
// useMemo) would violate the Rules of Hooks. No memoization here matches
// what both call sites already did before this was extracted (plain
// sort+map per render).
export function buildFleetShipListItems({
  ships,
  selectedShips,
  addShip,
  removeShip,
  setDraggedShipId,
  setDragOverPosition,
  attributesMap,
  attributesLoading,
  showInGameProperties,
  flipShips,
  tapPendingShipId = null,
  setTapPendingShipId,
  isTouchDevice = false,
}: BuildFleetShipListItemsParams): FleetShipListItemData[] {
  const sortedShips = [...ships].sort((a, b) => {
    const aSelected = selectedShips.includes(a.id);
    const bSelected = selectedShips.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return Number(a.id - b.id);
  });

  return sortedShips.map((ship) => {
    const canSelect =
      ship.shipData.timestampDestroyed === 0n &&
      ship.shipData.constructed &&
      !ship.shipData.inFleet;
    const isSelected = selectedShips.includes(ship.id);

    const handleTap = () => {
      if (!canSelect) return;
      if (isSelected) {
        removeShip(ship.id);
        setTapPendingShipId?.(null);
      } else if (isTouchDevice) {
        setTapPendingShipId?.(tapPendingShipId === ship.id ? null : ship.id);
      } else {
        addShip(ship.id);
      }
    };

    return {
      key: ship.id.toString(),
      canSelect,
      isPending: tapPendingShipId === ship.id,
      isTouchDevice,
      isFlipped: flipShips,
      onDragStart: () => setDraggedShipId(ship.id),
      onDragEnd: () => {
        setDraggedShipId(null);
        setDragOverPosition(null);
      },
      card: (
        <ShipCard
          ship={toShipCardData(ship)}
          shipImage={<ShipImage ship={ship} className="h-full w-full" />}
          isStarred={false}
          onToggleStar={() => {}}
          isSelected={isSelected}
          onToggleSelection={handleTap}
          onRecycleClick={() => {}}
          showInGameProperties={showInGameProperties}
          inGameAttributes={attributesMap.get(ship.id)}
          attributesLoading={attributesLoading}
          selectionMode={true}
          hideRecycle={true}
          hideCheckbox={true}
          onCardClick={handleTap}
          canSelect={canSelect}
          flipShip={flipShips}
        />
      ),
    };
  });
}
