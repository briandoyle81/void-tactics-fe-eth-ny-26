"use client";

import type { ReactNode } from "react";

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
}

interface FleetShipListPanelProps {
  widthClass: string;
  items: FleetShipListItemData[];
}

export function FleetShipListPanel({ widthClass, items }: FleetShipListPanelProps) {
  return (
    <div className={`${widthClass} h-full`}>
      <div className="grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh]">
        {items.map((item) => (
          <div
            key={item.key}
            draggable={item.canSelect && !item.isTouchDevice}
            onDragStart={(e) => {
              if (item.canSelect) {
                item.onDragStart();
                e.dataTransfer.effectAllowed = "move";
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
