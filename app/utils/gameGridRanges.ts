import { Attributes, ShipPosition, ActionType } from "../types/types";
import { GridShipPosition } from "../types/gridDisplay";

export function hasLineOfSight(
  row0: number,
  col0: number,
  row1: number,
  col1: number,
  blockedGrid: boolean[][],
): boolean {
  if (blockedGrid[row0] && blockedGrid[row0][col0]) return false;

  if (row0 === row1 && col0 === col1) {
    return !(blockedGrid[row1] && blockedGrid[row1][col1]);
  }

  const dRow = Math.abs(row1 - row0);
  const dCol = Math.abs(col1 - col0);
  const sRow = row1 > row0 ? 1 : row1 < row0 ? -1 : 0;
  const sCol = col1 > col0 ? 1 : col1 < col0 ? -1 : 0;

  let err = dCol - dRow;
  let row = row0;
  let col = col0;

  while (true) {
    if (row === row1 && col === col1) {
      return !(blockedGrid[row1] && blockedGrid[row1][col1]);
    }

    const e2 = err * 2;

    if (e2 === 0) {
      if (
        blockedGrid[row] &&
        blockedGrid[row][col + sCol] &&
        blockedGrid[row + sRow] &&
        blockedGrid[row + sRow][col]
      ) {
        return false;
      }
      col += sCol;
      err -= dRow;
      row += sRow;
      err += dCol;
      if (
        (row !== row1 || col !== col1) &&
        blockedGrid[row] &&
        blockedGrid[row][col]
      ) {
        return false;
      }
      continue;
    }

    if (e2 > -dRow) {
      err -= dRow;
      col += sCol;
      if (
        (row !== row1 || col !== col1) &&
        blockedGrid[row] &&
        blockedGrid[row][col]
      ) {
        return false;
      }
    }

    if (e2 < dCol) {
      err += dCol;
      row += sRow;
      if (
        (row !== row1 || col !== col1) &&
        blockedGrid[row] &&
        blockedGrid[row][col]
      ) {
        return false;
      }
    }
  }
}

interface MovementRangeParams {
  gridWidth: number;
  gridHeight: number;
  selectedShipId: bigint | null;
  hasShips: boolean;
  shipMap: Map<bigint, unknown>;
  getShipAttributes: (shipId: bigint) => Attributes | null;
  shipPositions: readonly ShipPosition[];
  previewPosition: { row: number; col: number } | null;
  canEnterOccupiedCell?: (
    row: number,
    col: number,
    occupyingShipId: bigint,
  ) => boolean;
}

interface ShootingRangeParams {
  gridWidth: number;
  gridHeight: number;
  selectedShipId: bigint | null;
  hasShips: boolean;
  shipMap: Map<bigint, unknown>;
  getShipAttributes: (shipId: bigint) => Attributes | null;
  shipPositions: readonly ShipPosition[];
  previewPosition: { row: number; col: number } | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialRange: number | undefined;
  specialType: number;
  blockedGrid: boolean[][];
}

/**
 * Shared movement-range calculation used by both the live game display and the
 * tutorial simulated game. This is extracted from the main GameDisplay
 * component so both views stay visually identical.
 */
export function computeMovementRange({
  gridWidth,
  gridHeight,
  selectedShipId,
  hasShips,
  shipMap,
  getShipAttributes,
  shipPositions,
  previewPosition,
  canEnterOccupiedCell,
}: MovementRangeParams): { row: number; col: number }[] {
  if (!selectedShipId || !hasShips) return [];

  const ship = shipMap.get(selectedShipId);
  if (!ship) return [];

  const attributes = getShipAttributes(selectedShipId);
  // Disabled ships (0 HP) cannot move; only retreat is available
  if (attributes && attributes.hullPoints === 0) return [];

  const movementRange = attributes?.movement || 1;

  const currentPosition = shipPositions.find(
    (pos) => pos.shipId === selectedShipId,
  );

  if (!currentPosition) return [];

  // If ship has a preview position (including "stay in place"), don't show movement range
  // so only weapon range is shown.
  if (previewPosition) {
    return [];
  }

  const validMoves: { row: number; col: number }[] = [];
  const startRow = currentPosition.position.row;
  const startCol = currentPosition.position.col;

  // Check all positions within movement range
  for (
    let row = Math.max(0, startRow - movementRange);
    row <= Math.min(gridHeight - 1, startRow + movementRange);
    row++
  ) {
    for (
      let col = Math.max(0, startCol - movementRange);
      col <= Math.min(gridWidth - 1, startCol + movementRange);
      col++
    ) {
      const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
      if (distance <= movementRange && distance > 0) {
        // Check if position is not occupied by another ship
        // Blocked tiles only block line of sight, not movement
        const isOccupied = shipPositions.some(
          (pos) => pos.position.row === row && pos.position.col === col,
        );
        const occupyingShip = shipPositions.find(
          (pos) => pos.position.row === row && pos.position.col === col,
        );
        const canEnterOccupied =
          occupyingShip != null &&
          canEnterOccupiedCell?.(row, col, occupyingShip.shipId) === true;

        if (!isOccupied || canEnterOccupied) {
          validMoves.push({ row, col });
        }
      }
    }
  }

  return validMoves;
}

/**
 * Shared shooting-range calculation extracted from GameDisplay so both live
 * games and the tutorial can use the exact same threat-range logic.
 */
export function computeShootingRange({
  gridWidth,
  gridHeight,
  selectedShipId,
  hasShips,
  shipMap,
  getShipAttributes,
  shipPositions,
  previewPosition,
  selectedWeaponType,
  specialRange,
  specialType,
  blockedGrid,
}: ShootingRangeParams): { row: number; col: number }[] {
  if (!selectedShipId || !hasShips) return [];

  const ship = shipMap.get(selectedShipId);
  if (!ship) return [];

  const attributes = getShipAttributes(selectedShipId);
  // Disabled ships (0 HP) have no move or threat range; only retreat is available
  if (attributes && attributes.hullPoints === 0) return [];

  const movementRange = attributes?.movement || 1;
  // Use special range if special is selected, otherwise use weapon range
  const shootingRange =
    selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes?.range || 1;

  const currentPosition = shipPositions.find(
    (pos) => pos.shipId === selectedShipId,
  );

  if (!currentPosition) return [];

  const validShootingPositions: { row: number; col: number }[] = [];

  // When a move is entered (preview set), show gun range from that single origin only
  if (previewPosition) {
    const startRow = previewPosition.row;
    const startCol = previewPosition.col;

    // First, add all positions that are exactly 1 square away from preview position
    // (ships can always shoot adjacent enemies, even in nebula)
    for (
      let row = Math.max(0, startRow - 1);
      row <= Math.min(gridHeight - 1, startRow + 1);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - 1);
        col <= Math.min(gridWidth - 1, startCol + 1);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Only add positions that are exactly 1 square away and not occupied
        if (distance === 1) {
          const isOccupied = shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

          if (!isOccupied) {
            validShootingPositions.push({ row, col });
          }
        }
      }
    }

    // Then check all positions within shooting range from preview position
    for (
      let row = Math.max(0, startRow - shootingRange);
      row <= Math.min(gridHeight - 1, startRow + shootingRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - shootingRange);
        col <= Math.min(gridWidth - 1, startCol + shootingRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Only check positions within shooting range, excluding adjacent ones (already added above)
        if (distance <= shootingRange && distance > 1) {
          // Check if position is not occupied by another ship
          const isOccupied = shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

          if (!isOccupied) {
            // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
            // OR special abilities ignore nebula squares
            // OR regular weapons need line of sight
            const shouldCheckLineOfSight =
              distance > 1 && // Not adjacent
              (selectedWeaponType !== "special" ||
                (specialType !== 1 &&
                  specialType !== 2 &&
                  specialType !== 3)); // Not EMP, Repair, or Flak

            if (
              !shouldCheckLineOfSight ||
              hasLineOfSight(startRow, startCol, row, col, blockedGrid)
            ) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }

  // Original logic for showing shooting range from all possible move positions
  const startRow = currentPosition.position.row;
  const startCol = currentPosition.position.col;

  // First, add all positions that are exactly 1 square away from any valid move position
  // (ships can always shoot adjacent enemies, even in nebula)
  for (
    let row = Math.max(0, startRow - movementRange - 1);
    row <= Math.min(gridHeight - 1, startRow + movementRange + 1);
    row++
  ) {
    for (
      let col = Math.max(0, startCol - movementRange - 1);
      col <= Math.min(gridWidth - 1, startCol + movementRange + 1);
      col++
    ) {
      const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

      // Only check positions that are exactly 1 square away from any valid move position
      if (distance === movementRange + 1) {
        const isOccupied = shipPositions.some(
          (pos) => pos.position.row === row && pos.position.col === col,
        );

        if (!isOccupied) {
          // Check if this position is exactly 1 square away from any valid move position
          let isAdjacentToMovePosition = false;

          // Check all possible move positions
          for (
            let moveRow = Math.max(0, startRow - movementRange);
            moveRow <= Math.min(gridHeight - 1, startRow + movementRange);
            moveRow++
          ) {
            for (
              let moveCol = Math.max(0, startCol - movementRange);
              moveCol <= Math.min(gridWidth - 1, startCol + movementRange);
              moveCol++
            ) {
              const moveDistance =
                Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
              if (moveDistance <= movementRange && moveDistance > 0) {
                // Check if this move position is not occupied
                const isMoveOccupied = shipPositions.some(
                  (pos) =>
                    pos.position.row === moveRow &&
                    pos.position.col === moveCol,
                );

                if (!isMoveOccupied) {
                  // Check if this position is exactly 1 square away from this move position
                  const adjacentDistance =
                    Math.abs(moveRow - row) + Math.abs(moveCol - col);
                  if (adjacentDistance === 1) {
                    isAdjacentToMovePosition = true;
                    break;
                  }
                }
              }
            }
            if (isAdjacentToMovePosition) break;
          }

          if (isAdjacentToMovePosition) {
            validShootingPositions.push({ row, col });
          }
        }
      }
    }
  }

  // Then check all positions within movement + shooting range
  const totalRange = movementRange + shootingRange;
  for (
    let row = Math.max(0, startRow - totalRange);
    row <= Math.min(gridHeight - 1, startRow + totalRange);
    row++
  ) {
    for (
      let col = Math.max(0, startCol - totalRange);
      col <= Math.min(gridWidth - 1, startCol + totalRange);
      col++
    ) {
      const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

      // Position must be within movement + shooting range, but not within just movement range
      // (movement range positions are already highlighted as movement tiles)
      // Also exclude positions that are exactly 1 square away (already added above)
      if (
        distance > movementRange &&
        distance <= totalRange &&
        distance !== 1
      ) {
        // Check if position is not occupied by another ship
        const isOccupied = shipPositions.some(
          (pos) => pos.position.row === row && pos.position.col === col,
        );

        if (!isOccupied) {
          // Check if any valid move position can shoot to this target position
          // We need to check if there's a valid move position that has line of sight to this target
          let canShootFromSomewhere = false;

          // Check all possible move positions
          for (
            let moveRow = Math.max(0, startRow - movementRange);
            moveRow <= Math.min(gridHeight - 1, startRow + movementRange);
            moveRow++
          ) {
            for (
              let moveCol = Math.max(0, startCol - movementRange);
              moveCol <= Math.min(gridWidth - 1, startCol + movementRange);
              moveCol++
            ) {
              const moveDistance =
                Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
              if (moveDistance <= movementRange && moveDistance > 0) {
                // Check if this move position is not occupied
                const isMoveOccupied = shipPositions.some(
                  (pos) =>
                    pos.position.row === moveRow &&
                    pos.position.col === moveCol,
                );

                if (!isMoveOccupied) {
                  // Check if this move position can shoot to the target
                  const shootDistance =
                    Math.abs(moveRow - row) + Math.abs(moveCol - col);

                  // Ships can always shoot enemies that are exactly 1 square away
                  // OR within their normal shooting range
                  const canShoot =
                    shootDistance === 1 || shootDistance <= shootingRange;

                  if (canShoot) {
                    // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
                    // OR special abilities ignore nebula squares
                    // OR regular weapons need line of sight
                    const shouldCheckLineOfSight =
                      shootDistance > 1 && // Not adjacent
                      (selectedWeaponType !== "special" ||
                        (specialType !== 1 &&
                          specialType !== 2 &&
                          specialType !== 3)); // Not EMP, Repair, or Flak

                    if (
                      !shouldCheckLineOfSight ||
                      hasLineOfSight(
                        moveRow,
                        moveCol,
                        row,
                        col,
                        blockedGrid,
                      )
                    ) {
                      canShootFromSomewhere = true;
                      break;
                    }
                  }
                }
              }
            }
            if (canShootFromSomewhere) break;
          }

          if (canShootFromSomewhere) {
            validShootingPositions.push({ row, col });
          }
        }
      }
    }
  }

  return validShootingPositions;
}

interface ShipOwner {
  owner: string;
}

interface LabelTargetsParams {
  selectedShipId: bigint | null;
  previewPosition: { row: number; col: number } | null;
  isRammingMovePreview: boolean;
  shipPositions: readonly ShipPosition[];
  shipMap: Map<bigint, ShipOwner>;
  playerAddress: string | null;
  getShipAttributes: (shipId: bigint) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialRange: number | undefined;
  specialType: number;
  blockedGrid: boolean[][];
  gridWidth: number;
  gridHeight: number;
}

export function computeLabelTargets({
  selectedShipId,
  previewPosition,
  isRammingMovePreview,
  shipPositions,
  shipMap,
  playerAddress,
  getShipAttributes,
  selectedWeaponType,
  specialRange,
  specialType,
  blockedGrid,
  gridWidth,
  gridHeight,
}: LabelTargetsParams): { shipId: bigint; position: { row: number; col: number } }[] {
  if (!selectedShipId) return [];
  if (isRammingMovePreview) return [];

  const attributes = getShipAttributes(selectedShipId);
  if (attributes && attributes.hullPoints === 0) return [];

  const movementRangeAttr = attributes?.movement || 1;
  const shootingRangeAttr =
    selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes?.range || 1;

  const currentPosition = shipPositions.find(
    (pos) => pos.shipId === selectedShipId,
  );
  if (!currentPosition) return [];

  const origins: { row: number; col: number }[] = [];
  if (previewPosition) {
    origins.push({ row: previewPosition.row, col: previewPosition.col });
  } else {
    origins.push({
      row: currentPosition.position.row,
      col: currentPosition.position.col,
    });
    for (
      let row = Math.max(0, currentPosition.position.row - movementRangeAttr);
      row <= Math.min(gridHeight - 1, currentPosition.position.row + movementRangeAttr);
      row++
    ) {
      for (
        let col = Math.max(0, currentPosition.position.col - movementRangeAttr);
        col <= Math.min(gridWidth - 1, currentPosition.position.col + movementRangeAttr);
        col++
      ) {
        const dist =
          Math.abs(row - currentPosition.position.row) +
          Math.abs(col - currentPosition.position.col);
        if (dist <= movementRangeAttr && dist > 0) {
          const occupied = shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );
          if (!occupied) origins.push({ row, col });
        }
      }
    }
  }

  const targetMap = new Map<bigint, { shipId: bigint; position: { row: number; col: number } }>();

  for (const { row: startRow, col: startCol } of origins) {
    shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId) return;
        } else if (specialType === 1) {
          if (ship.owner === playerAddress) return;
        } else {
          if (ship.owner !== playerAddress) return;
        }
      } else {
        if (ship.owner === playerAddress) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance = Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
      const canShoot = distance === 1 || distance <= shootingRangeAttr;

      if (canShoot && distance > 0) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
          !shouldCheckLineOfSight ||
          hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
        ) {
          targetMap.set(shipPosition.shipId, {
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });
  }

  return Array.from(targetMap.values());
}

interface HoverValidTargetsParams {
  selectedShipId: bigint | null;
  hoverPreviewPosition: { row: number; col: number } | null;
  hasShips: boolean;
  shipPositions: readonly ShipPosition[];
  shipMap: Map<bigint, ShipOwner>;
  playerAddress: string | null;
  getShipAttributes: (shipId: bigint) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialRange: number | undefined;
  specialType: number;
  blockedGrid: boolean[][];
}

export function computeHoverValidTargets({
  selectedShipId,
  hoverPreviewPosition,
  hasShips,
  shipPositions,
  shipMap,
  playerAddress,
  getShipAttributes,
  selectedWeaponType,
  specialRange,
  specialType,
  blockedGrid,
}: HoverValidTargetsParams): { shipId: bigint; position: { row: number; col: number } }[] {
  if (!selectedShipId || !hoverPreviewPosition || !hasShips) return [];
  const attributes = getShipAttributes(selectedShipId);
  if (!attributes) return [];
  const range =
    selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes.range || 1;
  const { row: startRow, col: startCol } = hoverPreviewPosition;
  const spec = specialType;
  const targets: { shipId: bigint; position: { row: number; col: number } }[] = [];
  shipPositions.forEach((shipPosition) => {
    const ship = shipMap.get(shipPosition.shipId);
    if (!ship) return;
    if (selectedWeaponType === "special") {
      if (spec === 3) {
        if (shipPosition.shipId === selectedShipId) return;
      } else if (spec === 1) {
        if (ship.owner === playerAddress) return;
      } else {
        if (ship.owner !== playerAddress) return;
      }
    } else {
      if (ship.owner === playerAddress) return;
    }
    const { row: targetRow, col: targetCol } = shipPosition.position;
    const distance = Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
    const canShoot = distance === 1 || distance <= range;
    if (canShoot && distance > 0) {
      const shouldCheckLOS =
        distance > 1 &&
        (selectedWeaponType !== "special" ||
          (spec !== 1 && spec !== 2 && spec !== 3));
      if (
        !shouldCheckLOS ||
        hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
      ) {
        targets.push({ shipId: shipPosition.shipId, position: { row: targetRow, col: targetCol } });
      }
    }
  });
  return targets;
}

interface HoverShootingRangeParams {
  selectedShipId: bigint | null;
  hoverPreviewPosition: { row: number; col: number } | null;
  hasShips: boolean;
  shipPositions: readonly ShipPosition[];
  getShipAttributes: (shipId: bigint) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialRange: number | undefined;
  specialType: number;
  blockedGrid: boolean[][];
  gridWidth: number;
  gridHeight: number;
}

export function computeHoverShootingRange({
  selectedShipId,
  hoverPreviewPosition,
  hasShips,
  shipPositions,
  getShipAttributes,
  selectedWeaponType,
  specialRange,
  specialType,
  blockedGrid,
  gridWidth,
  gridHeight,
}: HoverShootingRangeParams): { row: number; col: number }[] {
  if (!selectedShipId || !hoverPreviewPosition || !hasShips) return [];
  const attributes = getShipAttributes(selectedShipId);
  if (!attributes) return [];
  const range =
    selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes.range || 1;
  const { row: startRow, col: startCol } = hoverPreviewPosition;
  const spec = specialType;
  const positions: { row: number; col: number }[] = [];
  for (let row = Math.max(0, startRow - range); row <= Math.min(gridHeight - 1, startRow + range); row++) {
    for (let col = Math.max(0, startCol - range); col <= Math.min(gridWidth - 1, startCol + range); col++) {
      const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
      if (distance > 0 && distance <= range) {
        const isOccupied = shipPositions.some(
          (p) => p.position.row === row && p.position.col === col,
        );
        if (!isOccupied) {
          const shouldCheckLOS =
            distance > 1 &&
            (selectedWeaponType !== "special" ||
              (spec !== 1 && spec !== 2 && spec !== 3));
          if (
            !shouldCheckLOS ||
            hasLineOfSight(startRow, startCol, row, col, blockedGrid)
          ) {
            positions.push({ row, col });
          }
        }
      }
    }
  }
  return positions;
}

export type ConfirmWidgetAnchor = {
  left: string;
  top: string;
  transform: string;
} | null;

/**
 * Compute the best placement for the grid's confirm-move widget to avoid
 * covering the target ship, weapon beam path, and move arrow. Tries
 * below → above → right → left in priority order adjusted for movement
 * direction, skipping positions that cover the target or leave the grid.
 * Extracted verbatim from `GameGrid.tsx` — same logic, same output.
 */
export function computeConfirmWidgetAnchor(params: {
  showConfirmWidget: boolean;
  previewPosition: { row: number; col: number } | null;
  selectedShipId: number | null;
  targetShipId: number | null;
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
}): ConfirmWidgetAnchor {
  const { showConfirmWidget, previewPosition, selectedShipId, targetShipId, grid, allShipPositions } = params;

  if (!showConfirmWidget) return null;

  // Resolve the anchor cell: target ship always wins when one is selected,
  // otherwise fall back to staged destination, then selected ship's current cell.
  let destRow = 0, destCol = 0;
  const hasRealTarget = targetShipId != null && targetShipId !== 0;
  if (hasRealTarget) {
    let found = false;
    outer0: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]?.shipId === targetShipId) {
          destRow = r; destCol = c; found = true; break outer0;
        }
      }
    }
    if (!found && allShipPositions) {
      const sp = allShipPositions.find((p) => p.shipId === targetShipId);
      if (sp) { destRow = sp.position.row; destCol = sp.position.col; found = true; }
    }
    if (!found) return null;
  } else if (previewPosition) {
    destRow = previewPosition.row;
    destCol = previewPosition.col;
  } else {
    let found = false;
    if (selectedShipId) {
      outer0: for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]?.shipId === selectedShipId) {
            destRow = r; destCol = c; found = true; break outer0;
          }
        }
      }
      if (!found && allShipPositions) {
        const sp = allShipPositions.find((p) => p.shipId === selectedShipId);
        if (sp) { destRow = sp.position.row; destCol = sp.position.col; found = true; }
      }
    }
    if (!found) return null;
  }

  // Find the ship's current (non-preview) cell to know the movement direction
  let shipRow = destRow, shipCol = destCol;
  outer: for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell?.shipId === selectedShipId && !cell.isPreview) {
        shipRow = r; shipCol = c;
        break outer;
      }
    }
  }

  // Find the target ship's cell (if any)
  let targetRow: number | null = null, targetCol: number | null = null;
  if (targetShipId) {
    outer2: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]?.shipId === targetShipId) {
          targetRow = r; targetCol = c;
          break outer2;
        }
      }
    }
    // Fallback: allShipPositions
    if (targetRow === null && allShipPositions) {
      const sp = allShipPositions.find((p) => p.shipId === targetShipId);
      if (sp) { targetRow = sp.position.row; targetCol = sp.position.col; }
    }
  }

  type Side = "below" | "above" | "right" | "left";

  // Approximate grid cells covered by the widget for each placement.
  // Widget is ~2.5 cols wide and ~1 row tall.
  const covers = (side: Side): { rMin: number; rMax: number; cMin: number; cMax: number } => {
    switch (side) {
      case "below": return { rMin: destRow + 1, rMax: destRow + 1, cMin: destCol - 1, cMax: destCol + 1 };
      case "above": return { rMin: destRow - 1, rMax: destRow - 1, cMin: destCol - 1, cMax: destCol + 1 };
      case "right": return { rMin: destRow,     rMax: destRow,     cMin: destCol + 1, cMax: destCol + 2 };
      case "left":  return { rMin: destRow,     rMax: destRow,     cMin: destCol - 2, cMax: destCol - 1 };
    }
  };

  const inBounds = (side: Side) => {
    switch (side) {
      case "below": return destRow < 10;
      case "above": return destRow > 0;
      case "right": return destCol <= 14;
      case "left":  return destCol >= 2;
    }
  };

  const conflictsTarget = (side: Side) => {
    if (targetRow === null || targetCol === null) return false;
    const { rMin, rMax, cMin, cMax } = covers(side);
    return targetRow >= rMin && targetRow <= rMax && targetCol >= cMin && targetCol <= cMax;
  };

  // Build priority order: prefer sides perpendicular to movement direction,
  // and prefer opposite to where the attack beam points (toward target).
  const dr = destRow - shipRow;
  const dc = destCol - shipCol;
  const tdr = targetRow !== null ? targetRow - destRow : 0;
  const tdc = targetCol !== null ? targetCol - destCol : 0;

  // "away from target" direction
  const targetBelow = tdr > 0, targetAbove = tdr < 0;
  const targetRight = tdc > 0, targetLeft  = tdc < 0;

  // "incoming arrow" direction
  const arrowFromAbove = dr > 0, arrowFromBelow = dr < 0;
  const arrowFromLeft  = dc > 0, arrowFromRight = dc < 0;

  // Score each side: lower = preferred
  const score = (side: Side): number => {
    let s = 0;
    // Avoid sides where the target is
    if (side === "below" && targetBelow) s += 10;
    if (side === "above" && targetAbove) s += 10;
    if (side === "right" && targetRight) s += 10;
    if (side === "left"  && targetLeft)  s += 10;
    // Prefer sides not in the arrow's incoming path
    if (side === "above" && arrowFromAbove) s += 3;
    if (side === "below" && arrowFromBelow) s += 3;
    if (side === "left"  && arrowFromLeft)  s += 3;
    if (side === "right" && arrowFromRight) s += 3;
    // Prefer below/above over left/right (fits better visually)
    if (side === "right" || side === "left") s += 1;
    return s;
  };

  const sides: Side[] = ["below", "above", "right", "left"];
  const sorted = sides
    .filter(inBounds)
    .sort((a, b) => score(a) - score(b));

  // Pick the best side that doesn't conflict; fall back to any valid side
  const best = sorted.find((s) => !conflictsTarget(s)) ?? sorted[0] ?? "below";

  const L = `${((destCol + 0.5) / 17) * 100}%`;
  const Lright = `${((destCol + 1) / 17) * 100}%`;
  const Lleft = `${(destCol / 17) * 100}%`;
  const Tmid = `${((destRow + 0.5) / 11) * 100}%`;

  switch (best) {
    case "below": return { left: L,      top: `${((destRow + 1) / 11) * 100}%`, transform: "translate(-50%, 3px)" };
    case "above": return { left: L,      top: `${(destRow / 11) * 100}%`,        transform: "translate(-50%, calc(-100% - 3px))" };
    case "right": return { left: Lright, top: Tmid,                               transform: "translate(4px, -50%)" };
    case "left":  return { left: Lleft,  top: Tmid,                               transform: "translate(calc(-100% - 4px), -50%)" };
  }
}

export type DamageLabelTarget = { shipId: number; row: number; col: number };

/** Same target list as the floating damage-label overlay (keeps destroy-preview art in sync). */
export function collectDamageLabelTargets(params: {
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
  selectedShipId: number | null;
  targetShipId: number | null;
  draggedShipId: number | null;
  dragOverCell: { row: number; col: number } | null;
  dragValidTargets: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  validTargets: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  labelTargets?: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
}): DamageLabelTarget[] {
  const {
    grid,
    allShipPositions,
    selectedShipId,
    targetShipId,
    draggedShipId,
    dragOverCell,
    dragValidTargets,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
  } = params;

  // RAM mode has no weapon damage labels; ram-specific labels are rendered separately.
  if (selectedWeaponType === "ram") return [];

  const targetsToShow: DamageLabelTarget[] = [];
  const selectedShipSide =
    selectedShipId != null
      ? (() => {
          for (let r = 0; r < grid.length; r++) {
            const row = grid[r];
            for (let c = 0; c < row.length; c++) {
              const cell = row[c];
              if (cell?.shipId === selectedShipId) {
                return cell.isCreator;
              }
            }
          }
          const fallback = allShipPositions?.find(
            (sp) => sp.shipId === selectedShipId,
          );
          return fallback?.isCreator ?? null;
        })()
      : null;

  const shouldShowTargetLabel = (
    shipId: number,
    fallbackIsCreator?: boolean,
  ) => {
    if (selectedShipSide == null) return true;
    const targetSide =
      fallbackIsCreator ??
      (() => {
        for (let r = 0; r < grid.length; r++) {
          const row = grid[r];
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell?.shipId === shipId) return cell.isCreator;
          }
        }
        const fallback = allShipPositions?.find((sp) => sp.shipId === shipId);
        return fallback?.isCreator;
      })();
    if (targetSide == null) return true;

    if (selectedWeaponType === "special" && specialType === 2) {
      return targetSide === selectedShipSide;
    }
    return targetSide !== selectedShipSide;
  };

  const pushTargetIfAllowed = (
    shipId: number,
    row: number,
    col: number,
    fallbackIsCreator?: boolean,
  ) => {
    if (!shouldShowTargetLabel(shipId, fallbackIsCreator)) return;
    if (targetsToShow.some((t) => t.shipId === shipId)) return;
    targetsToShow.push({ shipId, row, col });
  };

  if (targetShipId) {
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.shipId === targetShipId) {
          pushTargetIfAllowed(cell.shipId, r, c, cell.isCreator);
        }
      });
    });
  }

  if (draggedShipId && dragOverCell) {
    dragValidTargets.forEach((target) => {
      pushTargetIfAllowed(
        target.shipId,
        target.position.row,
        target.position.col,
      );
    });
  }

  const targetsForLabels = labelTargets ?? validTargets;
  const hasSingleSelectedTarget =
    targetShipId != null && targetShipId !== 0;

  // When a specific destination is active (drag or hover), only show labels for that
  // destination's valid targets — not the full multi-origin threat range.
  if (selectedShipId && !hasSingleSelectedTarget && !(draggedShipId && dragOverCell)) {
    targetsForLabels.forEach((target) => {
      pushTargetIfAllowed(
        target.shipId,
        target.position.row,
        target.position.col,
      );
    });
  }

  return targetsToShow;
}
