"use client";

import { Attributes, getMainWeaponName, getSpecialName } from "../types/types";
import { GridShip, GridShipPosition } from "../types/gridDisplay";

type Position = { row: number; col: number };

interface GameGridWeaponSelectorProps {
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
  shipMap: Map<number, GridShip>;
  selectedShipId: number | null;
  targetShipId: number | null;
  previewPosition: Position | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  movementRange: Array<Position>;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  getShipAttributes: (shipId: number) => Attributes | null;
  showConfirmWidget?: boolean;
  isRammingMovePreview?: boolean;
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setTargetShipId: (shipId: number | null) => void;
}

/**
 * Floating weapon selector — appears above the selected ship; stays visible
 * when targeting. Extracted verbatim from `GameGrid.tsx` — same JSX, same
 * behavior, just relocated.
 */
export function GameGridWeaponSelector({
  grid,
  allShipPositions,
  shipMap,
  selectedShipId,
  targetShipId,
  previewPosition,
  selectedWeaponType,
  specialType,
  movementRange,
  isCurrentPlayerTurn,
  isShipOwnedByCurrentPlayer,
  getShipAttributes,
  showConfirmWidget = false,
  isRammingMovePreview = false,
  setSelectedWeaponType,
  setTargetShipId,
}: GameGridWeaponSelectorProps) {
  const hasRealTarget = targetShipId != null && targetShipId !== 0;
  // Hide only when the confirm widget is actually showing without a real
  // target (it embeds its own copy of this selector then) — matches
  // GameGrid.tsx's `showConfirmWidget && previewPosition && ...` render gate
  // for <GameGridConfirmWidget> exactly. Checking showConfirmWidget alone
  // (without previewPosition) previously hid this selector even when the
  // confirm widget wasn't rendering yet (e.g. selecting a no-target special
  // like Flak before staging a move), leaving neither selector visible.
  if (showConfirmWidget && previewPosition && !hasRealTarget) {
    return null;
  }
  if (!selectedShipId || !isCurrentPlayerTurn) {
    return null;
  }
  if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
    return null;
  }
  if (isRammingMovePreview) {
    return null;
  }
  const ship = shipMap.get(selectedShipId);
  if (!ship) {
    return null;
  }

  // Find the ship's current (non-preview) cell position
  let shipRow = -1, shipCol = -1;
  outer: for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell?.shipId === selectedShipId && !cell.isPreview) {
        shipRow = r; shipCol = c; break outer;
      }
    }
  }
  if (shipRow < 0 && allShipPositions) {
    const sp = allShipPositions.find(p => p.shipId === selectedShipId);
    if (sp) { shipRow = sp.position.row; shipCol = sp.position.col; }
  }
  if (shipRow < 0) {
    return null;
  }

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
  if (weapons.length <= 1) {
    return null; // only one option — nothing to choose
  }

  // When a move is staged, anchor to the destination (same origin as the laser beam);
  // otherwise anchor to the ship's current (from) cell.
  const anchorRow = previewPosition ? previewPosition.row : shipRow;
  const anchorCol = previewPosition ? previewPosition.col : shipCol;
  const isTopRow = anchorRow === 0;
  const left = `${((anchorCol + 0.5) / 17) * 100}%`;
  const top = isTopRow ? `${((anchorRow + 1) / 11) * 100}%` : `${(anchorRow / 11) * 100}%`;
  const transform = isTopRow ? "translate(-50%, 4px)" : "translate(-50%, calc(-100% - 4px))";

  return (
    <div
      className="absolute z-[195] pointer-events-auto"
      style={{ left, top, transform }}
    >
      <div
        className="flex"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
          border: "2px solid var(--color-gunmetal)",
          borderTopColor: "var(--color-cyan)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
          filter: "drop-shadow(0 2px 8px color-mix(in srgb, var(--color-cyan) 25%, transparent))",
        }}
      >
        {weapons.map(({ value, label }, idx) => {
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
              className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors duration-100"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: isActive ? "var(--color-cyan)" : "var(--color-text-muted)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-cyan) 14%, transparent)"
                  : "transparent",
                borderRight: idx < weapons.length - 1 ? "1px solid var(--color-gunmetal)" : "none",
                borderRadius: 0,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
