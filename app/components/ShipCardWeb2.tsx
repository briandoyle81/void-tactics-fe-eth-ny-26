"use client";

import React from "react";
import { Web2Ship } from "../types/web2Ship";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";

// Web2-mode counterpart to `ShipCard.tsx`. Deliberately simpler — this is
// the first web2 ships-UI slice, not full feature parity with the web3
// card (no fleet-composition drag state, no in-game tooltip variant, etc).
// See docs/merge-explore-traditional-plan.md for what's still open.

interface ShipCardWeb2Props {
  ship: Web2Ship;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onRecycleClick?: (ship: Web2Ship) => void;
  onConstructClick?: (ship: Web2Ship) => void;
  recycleDisabled?: boolean;
}

const ShipCardWeb2: React.FC<ShipCardWeb2Props> = ({
  ship,
  isSelected = false,
  onToggleSelect,
  onRecycleClick,
  onConstructClick,
  recycleDisabled = false,
}) => {
  const isDestroyed = ship.shipData.timestampDestroyed > 0;
  const isConstructed = ship.shipData.constructed;

  return (
    <div
      className="flex flex-col gap-2 border-2 border-solid p-3"
      style={{
        borderColor: isSelected ? "var(--color-cyan)" : "var(--color-gunmetal)",
        backgroundColor: "var(--color-steel)",
        borderRadius: 0,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-bold text-text-primary truncate">
          {ship.name || `Ship #${ship.id}`}
        </span>
        {onToggleSelect && !isDestroyed && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(ship.id)}
            aria-label={`Select ${ship.name || `Ship #${ship.id}`}`}
          />
        )}
      </div>

      <div className="relative aspect-square w-full [container-type:size]">
        <ShipImageWeb2 ship={ship} className="h-full w-full" />
      </div>

      {ship.shipData.shiny && (
        <span
          className="self-start px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider"
          style={{
            color: "var(--color-amber)",
            border: "1px solid var(--color-amber)",
          }}
        >
          SHINY ★
        </span>
      )}

      {isConstructed && !isDestroyed && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] text-text-secondary">
          <span>WPN: {getMainWeaponName(ship.equipment.mainWeapon)}</span>
          <span>SPC: {getSpecialName(ship.equipment.special)}</span>
          <span>
            {ship.equipment.armor > 0
              ? `ARM: ${getArmorName(ship.equipment.armor)}`
              : ship.equipment.shields > 0
                ? `SHD: ${getShieldName(ship.equipment.shields)}`
                : "DEF: None"}
          </span>
          <span>COST: {ship.shipData.cost}</span>
        </div>
      )}

      {isDestroyed && (
        <div className="font-mono text-[11px] uppercase tracking-wider text-warning-red">
          Destroyed
        </div>
      )}

      <div className="flex gap-2">
        {!isConstructed && !isDestroyed && onConstructClick && (
          <button
            onClick={() => onConstructClick(ship)}
            className="flex-1 px-2 py-1 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid"
            style={{ borderColor: "var(--color-phosphor-green)", color: "var(--color-phosphor-green)", borderRadius: 0 }}
          >
            Construct
          </button>
        )}
        {isConstructed && !isDestroyed && !ship.shipData.inFleet && onRecycleClick && (
          <button
            onClick={() => onRecycleClick(ship)}
            disabled={recycleDisabled || ship.shipData.isFree}
            title={ship.shipData.isFree ? "Free ships cannot be recycled" : undefined}
            className="flex-1 px-2 py-1 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
          >
            Recycle
          </button>
        )}
      </div>
    </div>
  );
};

export default ShipCardWeb2;
