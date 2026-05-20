import { Attributes, ShipPosition, ActionType } from "../types/types";

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
  selectedWeaponType: "weapon" | "special";
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

