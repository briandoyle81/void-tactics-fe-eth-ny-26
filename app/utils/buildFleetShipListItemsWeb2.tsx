"use client";

import type { Attributes } from "../types/types";
import type { Web2Ship } from "../types/web2Ship";
import ShipCard from "../components/ShipCard";
import { ShipImageWeb2 } from "../components/ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import type { FleetShipListItemData } from "../components/FleetShipListPanel";

export interface BuildFleetShipListItemsWeb2Params {
  ships: Web2Ship[];
  selectedShips: number[];
  addShip: (shipId: number) => void;
  removeShip: (shipId: number) => void;
  setDraggedShipId: (shipId: number | null) => void;
  setDragOverPosition: (pos: { row: number; col: number } | null) => void;
  attributesMap: Map<number, Attributes>;
  attributesLoading: boolean;
  showInGameProperties: boolean;
  flipShips: boolean;
  tapPendingShipId?: number | null;
  setTapPendingShipId?: (id: number | null) => void;
  isTouchDevice?: boolean;
}

// Web2 counterpart to buildFleetShipListItems.tsx — same ship-card list
// builder, number-native (Web2Ship ids are plain numbers) instead of
// bigint-native, rendering the same shared ShipCard component.
export function buildFleetShipListItemsWeb2({
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
}: BuildFleetShipListItemsWeb2Params): FleetShipListItemData[] {
  const sortedShips = [...ships].sort((a, b) => {
    const aSelected = selectedShips.includes(a.id);
    const bSelected = selectedShips.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.id - b.id;
  });

  return sortedShips.map((ship) => {
    const canSelect =
      ship.shipData.timestampDestroyed === 0 &&
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
          ship={toShipCardDataWeb2(ship)}
          shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
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
