"use client";

import type { ReactNode } from "react";
import { setMirroredDragImage } from "../utils/dragShipImage";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// draggable/tappable ship-card list column inside the fleet-selection
// modal, ported verbatim from Lobbies.tsx. Each `ShipCard` is still built
// by the caller (its exact props differ in ship-id type — bigint vs
// number — and data source), so this only owns the per-item drag wrapper
// and the outer scroll/grid container.
export interface FleetShipListItemData {
  key: string;
  canSelect: boolean;
  isPending: boolean;
  isTouchDevice: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  card: ReactNode;
  // Whether `card` renders its ship art mirrored (creator ships — see
  // ShipCard's flipShip prop). The browser's default drag-ghost snapshot
  // does not reliably respect a live CSS transform (confirmed already
  // worked around once, for the live-game grid's own ship dragging — see
  // GameGridCell.tsx's onDragStart) — without baking the mirror into an
  // actual pixel snapshot here too, a dragged creator ship's ghost image
  // shows facing the wrong way even though the card and the final placed
  // ship both render correctly.
  isFlipped?: boolean;
}

interface FleetShipListPanelProps {
  widthClass: string;
  items: FleetShipListItemData[];
  /** Called with the dragged ship's id (as set via dataTransfer's
   * "text/plain" by MapDisplayView's on-grid ship drag) when a ship is
   * dropped back onto this list — the drop-to-unplace gesture. Omit to
   * leave this panel a drag source only, same as before. */
  onDropShip?: (shipId: string) => void;
}

export function FleetShipListPanel({ widthClass, items, onDropShip }: FleetShipListPanelProps) {
  return (
    <div
      className={`${widthClass} h-full`}
      onDragOver={(e) => {
        if (!onDropShip) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        if (!onDropShip) return;
        e.preventDefault();
        const shipId = e.dataTransfer.getData("text/plain");
        if (shipId) onDropShip(shipId);
      }}
    >
      <div className="grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh]">
        {items.map((item) => (
          <div
            key={item.key}
            draggable={item.canSelect && !item.isTouchDevice}
            onDragStart={(e) => {
              if (!item.canSelect) return;
              item.onDragStart();
              e.dataTransfer.effectAllowed = "move";

              // Custom drag image so a mirrored (creator) ship's ghost
              // actually shows mirrored — see isFlipped's doc comment above.
              const shipImg = e.currentTarget.querySelector(
                "img",
              ) as HTMLImageElement | null;
              if (shipImg) {
                setMirroredDragImage(e, shipImg, !!item.isFlipped);
              }
            }}
            onDragEnd={item.onDragEnd}
            className={`${item.canSelect && !item.isTouchDevice ? "cursor-move" : ""} ${item.isPending ? "outline outline-2 outline-amber" : ""}`}
          >
            {item.card}
          </div>
        ))}
      </div>
    </div>
  );
}
