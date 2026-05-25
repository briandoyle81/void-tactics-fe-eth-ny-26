import { describe, it, expect } from "vitest";
import { computeMovementRange, computeShootingRange } from "../gameGridRanges";
import { Attributes, ShipPosition } from "../../types/types";

const GRID_W = 17;
const GRID_H = 11;

function makeAttrs(overrides: Partial<Attributes> = {}): Attributes {
  return {
    version: 1,
    range: 3,
    gunDamage: 50,
    hullPoints: 100,
    maxHullPoints: 100,
    movement: 2,
    damageReduction: 0,
    reactorCriticalTimer: 0,
    statusEffects: [],
    ...overrides,
  };
}

function makePosition(shipId: number, row: number, col: number): ShipPosition {
  return { shipId, position: { row, col }, isCreator: true };
}

function emptyGrid(h = GRID_H, w = GRID_W): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(false));
}

const SHIP_ID = 1;

function baseMovementParams(
  attrs: Attributes,
  positions: ShipPosition[] = [],
  previewPosition: { row: number; col: number } | null = null
) {
  return {
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    selectedShipId: SHIP_ID,
    hasShips: true,
    shipMap: new Map([[SHIP_ID, {}]]),
    getShipAttributes: () => attrs,
    shipPositions: [makePosition(SHIP_ID, 5, 8), ...positions],
    previewPosition,
  };
}

function baseShootingParams(
  attrs: Attributes,
  positions: ShipPosition[] = [],
  previewPosition: { row: number; col: number } | null = null,
  blockedGrid: boolean[][] = emptyGrid()
) {
  return {
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    selectedShipId: SHIP_ID,
    hasShips: true,
    shipMap: new Map([[SHIP_ID, {}]]),
    getShipAttributes: () => attrs,
    shipPositions: [makePosition(SHIP_ID, 5, 8), ...positions],
    previewPosition,
    selectedWeaponType: "weapon" as const,
    specialRange: undefined,
    specialType: 0,
    blockedGrid,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// computeMovementRange
// ────────────────────────────────────────────────────────────────────────────

describe("computeMovementRange — basic", () => {
  it("returns empty when no ship selected", () => {
    const result = computeMovementRange({
      ...baseMovementParams(makeAttrs()),
      selectedShipId: null,
    });
    expect(result).toEqual([]);
  });

  it("returns empty when ship not in shipMap", () => {
    const result = computeMovementRange({
      ...baseMovementParams(makeAttrs()),
      shipMap: new Map(),
    });
    expect(result).toEqual([]);
  });

  it("returns empty when ship has 0 HP", () => {
    const result = computeMovementRange(
      baseMovementParams(makeAttrs({ hullPoints: 0 }))
    );
    expect(result).toEqual([]);
  });

  it("returns empty when previewPosition is set", () => {
    const result = computeMovementRange(
      baseMovementParams(makeAttrs(), [], { row: 5, col: 8 })
    );
    expect(result).toEqual([]);
  });

  it("does not include the ship's own position", () => {
    const result = computeMovementRange(baseMovementParams(makeAttrs()));
    expect(result).not.toContainEqual({ row: 5, col: 8 });
  });

  it("uses Manhattan distance for movement range", () => {
    // movement 1 from (5,8): valid tiles are distance-1 = {(4,8),(6,8),(5,7),(5,9)}
    const result = computeMovementRange(
      baseMovementParams(makeAttrs({ movement: 1 }))
    );
    expect(result).toContainEqual({ row: 4, col: 8 });
    expect(result).toContainEqual({ row: 6, col: 8 });
    expect(result).toContainEqual({ row: 5, col: 7 });
    expect(result).toContainEqual({ row: 5, col: 9 });
    // diagonal (distance 2) should NOT be in movement-1 range
    expect(result).not.toContainEqual({ row: 4, col: 7 });
  });

  it("does not include tiles occupied by other ships", () => {
    const blocker = makePosition(2, 4, 8); // directly above ship at (5,8)
    const result = computeMovementRange(
      baseMovementParams(makeAttrs({ movement: 1 }), [blocker])
    );
    expect(result).not.toContainEqual({ row: 4, col: 8 });
  });

  it("allows entering occupied tile when canEnterOccupiedCell returns true", () => {
    const blocker = makePosition(2, 4, 8);
    const result = computeMovementRange({
      ...baseMovementParams(makeAttrs({ movement: 1 }), [blocker]),
      canEnterOccupiedCell: () => true,
    });
    expect(result).toContainEqual({ row: 4, col: 8 });
  });

  it("clamps movement range to grid boundaries", () => {
    // Ship in corner (0,0) with movement 5
    const params = {
      ...baseMovementParams(makeAttrs({ movement: 5 })),
      shipPositions: [makePosition(SHIP_ID, 0, 0)],
    };
    const result = computeMovementRange(params);
    // All returned tiles must be within grid
    for (const pos of result) {
      expect(pos.row).toBeGreaterThanOrEqual(0);
      expect(pos.col).toBeGreaterThanOrEqual(0);
      expect(pos.row).toBeLessThan(GRID_H);
      expect(pos.col).toBeLessThan(GRID_W);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// computeShootingRange
// ────────────────────────────────────────────────────────────────────────────

describe("computeShootingRange — basic", () => {
  it("returns empty when no ship selected", () => {
    const result = computeShootingRange({
      ...baseShootingParams(makeAttrs()),
      selectedShipId: null,
    });
    expect(result).toEqual([]);
  });

  it("returns empty when ship has 0 HP", () => {
    const result = computeShootingRange(
      baseShootingParams(makeAttrs({ hullPoints: 0 }))
    );
    expect(result).toEqual([]);
  });

  it("returns empty tiles occupied by other ships", () => {
    const enemy = makePosition(2, 5, 11); // within range 3 + movement 2 = 5
    const result = computeShootingRange(
      baseShootingParams(makeAttrs(), [enemy])
    );
    expect(result).not.toContainEqual({ row: 5, col: 11 });
  });

  it("all returned positions are within grid bounds", () => {
    const result = computeShootingRange(baseShootingParams(makeAttrs()));
    for (const pos of result) {
      expect(pos.row).toBeGreaterThanOrEqual(0);
      expect(pos.col).toBeGreaterThanOrEqual(0);
      expect(pos.row).toBeLessThan(GRID_H);
      expect(pos.col).toBeLessThan(GRID_W);
    }
  });
});

describe("computeShootingRange — line of sight", () => {
  it("blocks tiles behind a nebula wall", () => {
    // Ship at (5,8), target at (5,12). Place a blocker col at (5,9),(5,10),(5,11).
    const blocked = emptyGrid();
    blocked[5][9] = true;
    blocked[5][10] = true;
    blocked[5][11] = true;

    const result = computeShootingRange(
      baseShootingParams(makeAttrs({ range: 5, movement: 1 }), [], null, blocked)
    );
    // (5,12) is behind the wall and should not be reachable
    expect(result).not.toContainEqual({ row: 5, col: 12 });
  });

  it("does not block adjacent (distance-1) tiles even when nebula is present", () => {
    // Place nebula ON the adjacent tile row
    const blocked = emptyGrid();
    blocked[5][9] = true;

    const result = computeShootingRange(
      baseShootingParams(makeAttrs({ range: 3, movement: 1 }), [], { row: 5, col: 8 }, blocked)
    );
    // (5,9) itself is blocked by nebula (the function checks the target tile)
    // Distance-1 tiles that are NOT blocked should still appear
    expect(result).toContainEqual({ row: 4, col: 8 });
  });

  it("special weapons EMP/Repair/Flak (types 1-3) ignore nebula", () => {
    const blocked = emptyGrid();
    // Block a column between ship (5,8) and target (5,12)
    for (let r = 0; r < GRID_H; r++) blocked[r][10] = true;

    const preview = { row: 5, col: 8 };
    const base = baseShootingParams(
      makeAttrs({ range: 5, movement: 1 }),
      [],
      preview,
      blocked
    );

    const resultNormal = computeShootingRange({ ...base, selectedWeaponType: "weapon" });
    const resultEMP = computeShootingRange({ ...base, selectedWeaponType: "special", specialType: 1, specialRange: 5 });

    // Normal weapon blocked, EMP ignores nebula
    expect(resultNormal).not.toContainEqual({ row: 5, col: 12 });
    expect(resultEMP).toContainEqual({ row: 5, col: 12 });
  });
});

describe("computeShootingRange — preview mode", () => {
  it("shoots from previewPosition instead of current position", () => {
    // Ship at (5,8), preview at (5,5). Range 2.
    // (5,7) is reachable from preview but was the ship's previous tile
    const result = computeShootingRange(
      baseShootingParams(makeAttrs({ range: 2, movement: 3 }), [], { row: 5, col: 5 })
    );
    // From (5,5), (5,7) is 2 away — should be in range
    expect(result).toContainEqual({ row: 5, col: 7 });
    // (5,3) is 2 away from preview — also in range
    expect(result).toContainEqual({ row: 5, col: 3 });
  });

  it("always includes distance-1 adjacent tiles from preview position", () => {
    const result = computeShootingRange(
      baseShootingParams(makeAttrs({ range: 1, movement: 1 }), [], { row: 5, col: 8 })
    );
    expect(result).toContainEqual({ row: 4, col: 8 });
    expect(result).toContainEqual({ row: 6, col: 8 });
  });
});
