import { describe, it, expect } from "vitest";
import { computeMovementRange } from "../gameGridRangesWeb2";
import { Attributes } from "../../types/types";
import type { Web2ShipPosition } from "../../types/web2Game";

// Regression coverage for the 2026-09-23 maps/deployment-zones redesign's
// impassable terrain reaching computeMovementRange — the live movement-range
// calculator every game display actually uses (via useGameplayInteraction.ts),
// as opposed to the older bigint-native copy in gameGridRanges.ts.

const GRID_W = 17;
const GRID_H = 11;
const SHIP_ID = 1;

function emptyGrid(h = GRID_H, w = GRID_W): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(false));
}

function makeAttrs(overrides: Partial<Attributes> = {}): Attributes {
  return {
    version: 1,
    range: 3,
    gunDamage: 50,
    hullPoints: 100,
    maxHullPoints: 100,
    movement: 4,
    damageReduction: 0,
    reactorCriticalTimer: 0,
    statusEffects: [],
    ...overrides,
  };
}

function makePosition(shipId: number, row: number, col: number): Web2ShipPosition {
  return { shipId, position: { row, col }, isCreator: true, status: 0 };
}

function baseParams(impassableGrid?: boolean[][]) {
  const attrs = makeAttrs();
  return {
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    selectedShipId: SHIP_ID,
    hasShips: true,
    shipMap: new Map([[SHIP_ID, {}]]),
    getShipAttributes: () => attrs,
    shipPositions: [makePosition(SHIP_ID, 5, 5)],
    previewPosition: null,
    impassableGrid,
  };
}

describe("computeMovementRange — impassable terrain", () => {
  it("without impassableGrid, behaves exactly as before (blocked-only tiles don't restrict movement)", () => {
    const result = computeMovementRange(baseParams());
    expect(result).toContainEqual({ row: 5, col: 9 }); // 4 tiles right, at the edge of movement 4
  });

  it("excludes a tile whose straight-line path crosses impassable terrain", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true; // sits between (5,5) and (5,9)
    const result = computeMovementRange(baseParams(impassable));
    expect(result).not.toContainEqual({ row: 5, col: 9 });
    // but a tile short of the impassable tile, on the same line, is still reachable
    expect(result).toContainEqual({ row: 5, col: 6 });
  });

  it("excludes landing directly on an impassable tile", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true;
    const result = computeMovementRange(baseParams(impassable));
    expect(result).not.toContainEqual({ row: 5, col: 7 });
  });

  it("does not exclude tiles reachable by a different straight line unaffected by the impassable tile", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true; // only blocks the horizontal line through row 5
    const result = computeMovementRange(baseParams(impassable));
    expect(result).toContainEqual({ row: 4, col: 5 });
    expect(result).toContainEqual({ row: 6, col: 5 });
  });
});
