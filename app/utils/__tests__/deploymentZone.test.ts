import { describe, it, expect } from "vitest";
import {
  defaultStartingPositions,
  isDeploymentTile,
  parseZoneTiles,
  startingPositionsError,
} from "../deploymentZone";

describe("parseZoneTiles", () => {
  it("accepts on-grid tiles and drops duplicates", () => {
    expect(parseZoneTiles([{ row: 1, col: 2 }, { row: 1, col: 2 }, { row: "3", col: 4 }])).toEqual([
      { row: 1, col: 2 },
      { row: 3, col: 4 },
    ]);
  });

  it("rejects non-arrays and off-grid tiles", () => {
    expect(parseZoneTiles("nope")).toBeNull();
    expect(parseZoneTiles([{ row: 11, col: 0 }])).toBeNull();
    expect(parseZoneTiles([{ row: 0, col: -1 }])).toBeNull();
    expect(parseZoneTiles([{ row: 0.5, col: 1 }])).toBeNull();
  });
});

describe("isDeploymentTile", () => {
  it("uses the default column bands when there's no custom zone", () => {
    expect(isDeploymentTile(5, 3, true, [])).toBe(true);
    expect(isDeploymentTile(5, 4, true, [])).toBe(false);
    expect(isDeploymentTile(5, 13, false, undefined)).toBe(true);
    expect(isDeploymentTile(5, 12, false, undefined)).toBe(false);
  });

  it("uses only the custom tiles when a zone is set", () => {
    const zone = [{ row: 2, col: 8 }];
    expect(isDeploymentTile(2, 8, true, zone)).toBe(true);
    expect(isDeploymentTile(2, 0, true, zone)).toBe(false);
  });
});

describe("startingPositionsError", () => {
  const zone = [
    { row: 0, col: 6 },
    { row: 1, col: 6 },
  ];

  it("accepts one distinct in-zone tile per ship", () => {
    expect(startingPositionsError([{ row: 0, col: 6 }, { row: 1, col: 6 }], 2, true, zone)).toBeNull();
  });

  it("rejects missing, out-of-zone, and duplicate positions", () => {
    expect(startingPositionsError(undefined, 1, true, zone)).toMatch(/starting position/);
    expect(startingPositionsError([{ row: 0, col: 6 }], 2, true, zone)).toMatch(/starting position/);
    expect(startingPositionsError([{ row: 0, col: 0 }], 1, true, zone)).toMatch(/deployment zone/);
    expect(
      startingPositionsError([{ row: 0, col: 6 }, { row: 0, col: 6 }], 2, true, zone),
    ).toMatch(/same tile/);
  });
});

describe("defaultStartingPositions", () => {
  it("fills custom zone tiles first", () => {
    const zone = [{ row: 4, col: 9 }, { row: 5, col: 9 }];
    expect(defaultStartingPositions(1, true, zone)).toEqual([{ row: 4, col: 9 }]);
  });

  it("keeps the old outer-column layout for the default band, inside the band", () => {
    const creator = defaultStartingPositions(3, true, []);
    expect(creator).toEqual([
      { row: 1, col: 0 },
      { row: 3, col: 0 },
      { row: 5, col: 0 },
    ]);
    const joiner = defaultStartingPositions(12, false, []);
    expect(joiner.every((p) => isDeploymentTile(p.row, p.col, false, []))).toBe(true);
    expect(new Set(joiner.map((p) => `${p.row},${p.col}`)).size).toBe(12);
  });
});
