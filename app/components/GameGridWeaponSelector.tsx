"use client";

import { Attributes, getMainWeaponName, getSpecialName } from "../types/types";
import { shipHasActivatableSpecial } from "../utils/specialConfigWeb2";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { useFactionAbilityIsHeal } from "../hooks/useFactionAbilityIsHeal";
import {
  selectedShipHasEffectLabel,
  SELF_EFFECT_LABEL_CLEARANCE_PX,
} from "../utils/gameGridRanges";

type Position = { row: number; col: number };

/** Repair is always available (self is in range). Ram needs a downed enemy near an origin. */
export function canOfferFactionAbility(params: {
  isFactionAbilitySupported: boolean;
  factionAbilityIsHeal: boolean;
  factionAbilityRange?: number;
  origins: ReadonlyArray<Position>;
  grid: (GridShipPosition | null)[][];
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  getShipAttributes: (shipId: number) => { hullPoints?: number } | null;
}): boolean {
  if (!params.isFactionAbilitySupported) return false;
  if (params.factionAbilityIsHeal) return true;
  const range = params.factionAbilityRange ?? 1;
  for (const origin of params.origins) {
    for (let r = 0; r < params.grid.length; r++) {
      const rowCells = params.grid[r] ?? [];
      for (let c = 0; c < rowCells.length; c++) {
        if (Math.abs(r - origin.row) + Math.abs(c - origin.col) > range) continue;
        const cell = rowCells[c];
        if (!cell || cell.isPreview) continue;
        if (params.isShipOwnedByCurrentPlayer(cell.shipId)) continue;
        if ((params.getShipAttributes(cell.shipId)?.hullPoints ?? 1) === 0) {
          return true;
        }
      }
    }
  }
  return false;
}

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
  /** Non-null (== selectedShipId) whenever the selection is in retreat mode
   * — forced for a disabled (0hp) ship, or voluntarily toggled for a
   * healthy one. Either way the ship can only Retreat this turn, so no
   * weapon/special/ram choice applies. */
  retreatPrepShipId?: number | null;
  /** See useFactionAbilityConfig.ts — gates the real Ram/Repair targeting flow vs. the legacy auto-ram chains still run. */
  isFactionAbilitySupported?: boolean;
  factionAbilityRange?: number | undefined;
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
  retreatPrepShipId = null,
  isFactionAbilitySupported = false,
  factionAbilityRange,
  setSelectedWeaponType,
  setTargetShipId,
}: GameGridWeaponSelectorProps) {
  // Resolved unconditionally (before the early `return null`s below) since
  // this is a hook call — rules-of-hooks requires it run on every render.
  const shipForFactionAbility = selectedShipId != null ? shipMap.get(selectedShipId) : undefined;
  const { isHeal: factionAbilityIsHeal } = useFactionAbilityIsHeal(
    shipForFactionAbility?.traits.variant,
  );

  // Confirm widget embeds this selector (including after a target is locked).
  // Hide the floating copy whenever that bar is showing so a switched
  // weapon/special/ram tab does not jump back to the ship.
  if (showConfirmWidget && (previewPosition || retreatPrepShipId != null)) {
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
  const ship = shipForFactionAbility;
  if (!ship) {
    return null;
  }
  // A ship in retreat mode (forced for 0hp, or voluntarily toggled) can
  // only submit Retreat this turn — surfaced via the on-grid/off-grid
  // confirm widgets' RETREAT button, never this weapon/special/ram selector.
  if (retreatPrepShipId != null) {
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

  const hasSpecial = shipHasActivatableSpecial(ship);
  // Where the chain still runs the legacy auto-ram-on-move model (see
  // useFactionAbilityConfig.ts), a target is "a disabled enemy sitting on a
  // tile I could move onto" — landing there IS the ram. Where the real
  // FactionAbility/resolver system exists, ramming/repairing no longer
  // moves the ship onto the target's tile at all (see
  // useGameplayInteraction.ts's isRammingMovePreview doc), so this checks
  // range-based reachability instead: is an eligible target within
  // factionAbilityRange of the ship's current tile or anywhere it could
  // move to? Repair's target is any friendly (including itself); Ram's is a
  // disabled enemy.
  const hasFactionAbilityTarget = canOfferFactionAbility({
    isFactionAbilitySupported,
    factionAbilityIsHeal,
    factionAbilityRange,
    origins: previewPosition
      ? [previewPosition, { row: shipRow, col: shipCol }, ...movementRange]
      : [{ row: shipRow, col: shipCol }, ...movementRange],
    grid,
    isShipOwnedByCurrentPlayer,
    getShipAttributes,
  }) || (
    !isFactionAbilitySupported &&
    movementRange.some(({ row: r, col: c }) => {
      const cell = grid[r]?.[c];
      if (!cell || cell.isPreview) return false;
      if (isShipOwnedByCurrentPlayer(cell.shipId)) return false;
      return (getShipAttributes(cell.shipId)?.hullPoints ?? 1) === 0;
    })
  );
  const weapons: { value: "weapon" | "special" | "ram"; label: string }[] = [
    ...(hasFactionAbilityTarget
      ? [{ value: "ram" as const, label: factionAbilityIsHeal ? "REPAIR" : "RAM" }]
      : []),
    { value: "weapon", label: getMainWeaponName(ship.equipment.mainWeapon, ship.traits.variant) },
    ...(hasSpecial ? [{ value: "special" as const, label: getSpecialName(ship.equipment.special, ship.traits.variant) }] : []),
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
  // Sit past the self-heal / field label so the selector does not cover it.
  const selfHasEffectLabel = selectedShipHasEffectLabel({
    selectedShipId,
    targetShipId,
    selectedWeaponType,
    specialType,
    shipVariant: ship.traits.variant,
    factionAbilityIsHeal,
  });
  const selectorGapPx = selfHasEffectLabel ? SELF_EFFECT_LABEL_CLEARANCE_PX : 4;
  const transform = isTopRow
    ? `translate(-50%, ${selectorGapPx}px)`
    : `translate(-50%, calc(-100% - ${selectorGapPx}px))`;

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
