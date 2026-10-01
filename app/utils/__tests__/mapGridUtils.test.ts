import { describe, it, expect } from "vitest";
import {
  buildMapGridsFromContractMap,
  readGameMapState,
} from "../mapGridUtils";

describe("readGameMapState", () => {
  it("prefers named outputs so scoring is never read as impassable", () => {
    const scoring = [{ row: 5, col: 8, points: 10, onlyOnce: false }];
    const impassable = [{ row: 2, col: 2 }];
    const blocked = [{ row: 1, col: 1 }];
    const namedOnly = {
      blockedPositions: blocked,
      scoringPositions: scoring,
      impassablePositions: impassable,
    };
    const parsed = readGameMapState(namedOnly);
    const grids = buildMapGridsFromContractMap(
      parsed.blockedPositions,
      parsed.scoringPositions,
      17,
      11,
      parsed.impassablePositions,
    );
    expect(grids.scoringGrid[5][8]).toBe(10);
    expect(grids.impassableGrid[5][8]).toBe(false);
    expect(grids.impassableGrid[2][2]).toBe(true);
    expect(grids.blockedGrid[1][1]).toBe(true);
  });

  it("still works with a numeric tuple (blocked, scoring, impassable)", () => {
    const data = [
      [{ row: 1, col: 1 }],
      [{ row: 5, col: 8, points: 10, onlyOnce: false }],
      [{ row: 2, col: 2 }],
    ];
    const parsed = readGameMapState(data);
    const grids = buildMapGridsFromContractMap(
      parsed.blockedPositions,
      parsed.scoringPositions,
      17,
      11,
      parsed.impassablePositions,
    );
    expect(grids.scoringGrid[5][8]).toBe(10);
    expect(grids.impassableGrid[5][8]).toBe(false);
    expect(grids.impassableGrid[2][2]).toBe(true);
  });
});
