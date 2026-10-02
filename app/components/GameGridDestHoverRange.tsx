"use client";

import React, { useLayoutEffect, useMemo } from "react";
import { isRepairDronesSpecial } from "../utils/specialConfigWeb2";
import { GridShip } from "../types/gridDisplay";
import { useGridDestHoveredTile, useGridHoveredCell } from "./GridHover";

type Position = { row: number; col: number };
type TargetRef = { shipId: number; position: Position };

const GRID_COLS = 17;
const GRID_ROWS = 11;

/** Only this outline reads ship hover, so hovering ships does not recompute the range. */
function DestOutline({ dest }: { dest: Position }) {
  const hoveredCell = useGridHoveredCell();
  if (
    hoveredCell != null &&
    !hoveredCell.fromFleet &&
    hoveredCell.row === dest.row &&
    hoveredCell.col === dest.col
  ) {
    return null;
  }
  if (dest.row < 0 || dest.row >= GRID_ROWS || dest.col < 0 || dest.col >= GRID_COLS) {
    return null;
  }
  return (
    <div
      className="z-[4] border-4 border-phosphor-green bg-phosphor-green/10"
      style={{
        gridColumn: dest.col + 1,
        gridRow: dest.row + 1,
      }}
    />
  );
}

export const GameGridDestHoverRange = React.memo(function GameGridDestHoverRange({
  gridLayoutRef,
  getHoverPreview,
  selectedShipId,
  previewPosition,
  retreatPrepShipId,
  draggedShipId,
  selectedWeaponType,
  specialType,
  shipMap,
  movementTileSet,
}: {
  gridLayoutRef: React.RefObject<HTMLDivElement | null>;
  getHoverPreview?: (cell: Position | null) => {
    shootingRange: Position[];
    validTargets: TargetRef[];
  };
  selectedShipId: number | null;
  previewPosition: Position | null;
  retreatPrepShipId?: number | null;
  draggedShipId: number | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  shipMap: Map<number, GridShip>;
  /** Hover only counts on the selected ship's movement tiles (guards a stale hover). */
  movementTileSet: Set<string>;
}) {
  const dest = useGridDestHoveredTile();
  const enabled =
    selectedShipId != null &&
    !previewPosition &&
    retreatPrepShipId == null &&
    !draggedShipId &&
    dest != null &&
    movementTileSet.has(`${dest.row},${dest.col}`);
  const activeDest = enabled ? dest : null;

  // Keyed on presence only: moving between dest tiles must not touch the
  // attribute (each flip restyles every shooting-range tile).
  const hasActiveDest = activeDest != null;
  useLayoutEffect(() => {
    const el = gridLayoutRef.current;
    if (!el || !hasActiveDest) return;
    el.setAttribute("data-dest-hover", "1");
    return () => {
      el.removeAttribute("data-dest-hover");
    };
  }, [gridLayoutRef, hasActiveDest]);

  const preview = useMemo(
    () => (activeDest && getHoverPreview ? getHoverPreview(activeDest) : null),
    [activeDest, getHoverPreview],
  );

  if (!activeDest || !preview) return null;

  const isRepair =
    selectedWeaponType === "special" &&
    isRepairDronesSpecial(
      selectedShipId != null
        ? Number(shipMap.get(selectedShipId)?.traits.variant ?? 1)
        : 1,
      specialType,
    );
  const rangeClass = isRepair
    ? "border-cyan/50 bg-cyan/10"
    : "border-amber/50 bg-amber/10";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3] grid gap-0 grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)]"
      aria-hidden
    >
      {selectedWeaponType !== "ram" &&
        preview.shootingRange.map((cell) => (
          <div
            key={`dest-range-${cell.row}-${cell.col}`}
            className={`border-1 ${rangeClass}`}
            style={{
              gridColumn: cell.col + 1,
              gridRow: cell.row + 1,
            }}
          />
        ))}
      <DestOutline dest={activeDest} />
    </div>
  );
});
