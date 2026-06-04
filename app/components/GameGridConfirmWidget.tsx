"use client";

import React from "react";
import { Ship, Attributes, ShipPosition, getMainWeaponName, getSpecialName } from "../types/types";
import { STYLE_LABEL } from "../styles/fontStyles";

interface ConfirmWidgetAnchor {
  left: string;
  top: string;
  transform: string;
}

interface GameGridConfirmWidgetProps {
  confirmWidgetAnchor: ConfirmWidgetAnchor;
  confirmWidgetLabel: string;
  onConfirmMove: () => void;
  onCancelMove: () => void;
  selectedShipId: number | null;
  shipMap: Map<number, Ship>;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  targetShipId: number | null;
  isRammingMovePreview: boolean;
  movementRange: readonly { row: number; col: number }[];
  grid: (ShipPosition | null)[][];
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  getShipAttributes: (shipId: number) => Attributes | null;
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setTargetShipId: (id: number | null) => void;
}

export function GameGridConfirmWidget({
  confirmWidgetAnchor,
  confirmWidgetLabel,
  onConfirmMove,
  onCancelMove,
  selectedShipId,
  shipMap,
  selectedWeaponType,
  specialType,
  targetShipId,
  isRammingMovePreview,
  movementRange,
  grid,
  isShipOwnedByCurrentPlayer,
  getShipAttributes,
  setSelectedWeaponType,
  setTargetShipId,
}: GameGridConfirmWidgetProps) {
  const hasRealTarget = targetShipId != null && targetShipId !== 0;

  const embeddedWeaponSelector = (() => {
    if (hasRealTarget) return null;
    if (isRammingMovePreview) return null;
    const ship = selectedShipId ? shipMap.get(selectedShipId) : null;
    if (!ship) return null;
    const hasSpecial = ship.equipment.special > 0;
    const hasRamTarget = movementRange.some(({ row: r, col: c }) => {
      const cell = grid[r]?.[c];
      if (!cell || cell.isPreview) return false;
      if (isShipOwnedByCurrentPlayer(cell.shipId)) return false;
      return (getShipAttributes(cell.shipId)?.hullPoints ?? 1) === 0;
    });
    const weapons: { value: "weapon" | "special" | "ram"; label: string }[] = [
      ...(hasRamTarget ? [{ value: "ram" as const, label: "RAM" }] : []),
      { value: "weapon", label: getMainWeaponName(ship.equipment.mainWeapon) },
      ...(hasSpecial ? [{ value: "special" as const, label: getSpecialName(ship.equipment.special) }] : []),
    ];
    return (
      <div className="flex border-b" style={{ borderColor: "var(--color-gunmetal)" }}>
        {weapons.map(({ value, label }) => {
          const isActive = selectedWeaponType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSelectedWeaponType(value);
                if (value === "special" && specialType === 3) {
                  setTargetShipId(0);
                } else if (selectedWeaponType === "special" && specialType === 3) {
                  setTargetShipId(null);
                }
              }}
              className="flex-1 px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors duration-100"
              style={{
                ...STYLE_LABEL,
                color: isActive ? "var(--color-cyan)" : "var(--color-text-muted)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-cyan) 14%, transparent)"
                  : "transparent",
                borderRight:
                  value !== weapons[weapons.length - 1].value
                    ? "1px solid var(--color-gunmetal)"
                    : "none",
                borderRadius: 0,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  })();

  return (
    <div
      className="absolute z-[195] pointer-events-auto"
      style={{
        left: confirmWidgetAnchor.left,
        top: confirmWidgetAnchor.top,
        transform: confirmWidgetAnchor.transform,
        filter:
          "drop-shadow(0 4px 14px color-mix(in srgb, var(--color-phosphor-green) 35%, transparent))",
      }}
    >
      <div
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
          border: "2px solid var(--color-gunmetal)",
          borderTopColor: "var(--color-cyan)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
          clipPath:
            "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
          minWidth: "7.5rem",
        }}
      >
        {embeddedWeaponSelector}
        <div className="flex">
          <button
            type="button"
            onClick={onConfirmMove}
            className="flex-[2] px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors duration-100"
            style={{
              ...STYLE_LABEL,
              color: "var(--color-phosphor-green)",
              backgroundColor:
                "color-mix(in srgb, var(--color-phosphor-green) 10%, transparent)",
              borderRight: "1px solid var(--color-gunmetal)",
              borderRadius: 0,
              letterSpacing: "0.14em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--color-phosphor-green) 22%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--color-phosphor-green) 10%, transparent)";
            }}
          >
            {confirmWidgetLabel}
          </button>
          <button
            type="button"
            onClick={onCancelMove}
            className="px-3 py-2 text-sm font-bold transition-colors duration-100"
            style={{
              ...STYLE_LABEL,
              color: "var(--color-text-muted)",
              backgroundColor: "transparent",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-warning-red)";
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--color-warning-red) 12%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
