import { describe, it, expect } from "vitest";
import {
  computeMovementRange,
  computeShootingRange,
  hasMovementPath,
  hasLineOfSight,
  buildEnemyOccupiedGrid,
  collectDamageLabelTargets,
  selectedShipHasEffectLabel,
  computeConfirmWidgetAnchor,
  SELF_EFFECT_LABEL_CLEARANCE_PX,
} from "../gameGridRanges";
import { Attributes, ShipPosition } from "../../types/types";
import { GridShipPosition } from "../../types/gridDisplay";

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

function makePosition(shipId: bigint, row: number, col: number): ShipPosition {
  return { shipId, position: { row, col }, isCreator: true };
}

function emptyGrid(h = GRID_H, w = GRID_W): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(false));
}

const SHIP_ID = 1n;

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
    const blocker = makePosition(2n, 4, 8); // directly above ship at (5,8)
    const result = computeMovementRange(
      baseMovementParams(makeAttrs({ movement: 1 }), [blocker])
    );
    expect(result).not.toContainEqual({ row: 4, col: 8 });
  });

  it("allows entering occupied tile when canEnterOccupiedCell returns true", () => {
    const blocker = makePosition(2n, 4, 8);
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
    const enemy = makePosition(2n, 5, 11); // within range 3 + movement 2 = 5
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

// Regression coverage for the 2026-09-23 maps/deployment-zones redesign's
// impassable terrain (docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md
// §1) — mirrors Maps.sol's hasMovementPath exactly.
describe("hasMovementPath", () => {
  it("allows a clear straight line", () => {
    expect(hasMovementPath(5, 5, 5, 8, emptyGrid())).toBe(true);
  });

  it("blocks a path that crosses impassable terrain partway through, not just at the destination", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true; // between (5,5) and (5,9)
    expect(hasMovementPath(5, 5, 5, 9, impassable)).toBe(false);
  });

  it("blocks landing directly on an impassable tile", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true;
    expect(hasMovementPath(5, 5, 5, 7, impassable)).toBe(false);
  });

  it("does NOT apply hasLineOfSight's start-tile-blocked exception — a ship can always leave its own tile", () => {
    const impassable = emptyGrid();
    impassable[5][5] = true; // the ship's own current tile
    expect(hasMovementPath(5, 5, 5, 6, impassable)).toBe(true);
  });

  it("staying in place is always a legal no-op, even on an impassable tile", () => {
    const impassable = emptyGrid();
    impassable[5][5] = true;
    expect(hasMovementPath(5, 5, 5, 5, impassable)).toBe(true);
  });

  it("a diagonal step succeeds if at least one of the two corner tiles is passable (permissive-corner rule)", () => {
    const impassable = emptyGrid();
    impassable[5][6] = true; // only one of the two corner tiles blocked
    expect(hasMovementPath(5, 5, 6, 6, impassable)).toBe(true);
  });

  it("a diagonal step fails when both corner tiles are impassable", () => {
    const impassable = emptyGrid();
    impassable[5][6] = true;
    impassable[6][5] = true;
    expect(hasMovementPath(5, 5, 6, 6, impassable)).toBe(false);
  });

  it("OR's extra occupancy into the path the same way enemy ships block on-chain", () => {
    const extra = emptyGrid();
    extra[5][7] = true;
    expect(hasMovementPath(5, 5, 5, 9, emptyGrid(), extra)).toBe(false);
    expect(hasMovementPath(5, 5, 5, 6, emptyGrid(), extra)).toBe(true);
  });

  it("blocks dest extra occupancy the same way Maps.hasMovementPathAvoidingShips dest-checks the OR'd bitmap", () => {
    const extra = emptyGrid();
    extra[5][8] = true;
    expect(hasMovementPath(5, 5, 5, 8, emptyGrid(), extra)).toBe(false);
  });

  it("does not treat scoring-point values as impassable terrain", () => {
    const scoringAsTerrain = Array.from({ length: GRID_H }, () =>
      Array.from({ length: GRID_W }, () => 0),
    ) as unknown as boolean[][];
    (scoringAsTerrain[5][8] as unknown as number) = 10;
    expect(hasMovementPath(5, 5, 5, 8, scoringAsTerrain)).toBe(true);
  });

  it("does not skip Bresenham because the dest is a scoring tile", () => {
    const impassable = emptyGrid();
    impassable[5][7] = true;
    expect(hasMovementPath(5, 5, 5, 9, impassable)).toBe(false);
  });
});

describe("buildEnemyOccupiedGrid — disabled enemies", () => {
  it("omits 0 HP enemies from movement-through and LOS occupancy", () => {
    const grid = buildEnemyOccupiedGrid(
      GRID_W,
      GRID_H,
      [
        { shipId: 1, position: { row: 5, col: 8 }, isCreator: true },
        { shipId: 2, position: { row: 5, col: 10 }, isCreator: false },
      ],
      1,
      true,
      (id) => String(id) === "2",
    );
    expect(grid[5][10]).toBe(false);
  });

  it("still marks living enemies as blocking", () => {
    const grid = buildEnemyOccupiedGrid(
      GRID_W,
      GRID_H,
      [
        { shipId: 1, position: { row: 5, col: 8 }, isCreator: true },
        { shipId: 2, position: { row: 5, col: 10 }, isCreator: false },
      ],
      1,
      true,
      () => false,
    );
    expect(grid[5][10]).toBe(true);
  });
});

describe("hasLineOfSight — enemy occupancy", () => {
  it("blocks shooting through an extra-occupied intermediate tile", () => {
    const extra = emptyGrid();
    extra[5][10] = true;
    expect(hasLineOfSight(5, 8, 5, 12, emptyGrid(), extra)).toBe(false);
  });

  it("still allows shooting the dest tile even if dest is extra-occupied (the target itself)", () => {
    const extra = emptyGrid();
    extra[5][12] = true;
    expect(hasLineOfSight(5, 8, 5, 12, emptyGrid(), extra)).toBe(true);
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

describe("collectDamageLabelTargets — Lightening Field", () => {
  function pos(shipId: number, row: number, col: number, isCreator: boolean): GridShipPosition {
    return { shipId, position: { row, col }, isCreator };
  }

  it("labels every ship in range, including friendlies and the caster", () => {
    const caster = pos(1, 5, 5, true);
    const ally = pos(2, 5, 6, true);
    const enemy = pos(3, 5, 7, false);
    const outOfRange = pos(4, 5, 10, false);
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: [caster, ally, enemy, outOfRange],
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: [],
      selectedWeaponType: "special",
      specialType: 1,
      shipVariant: 2,
      previewPosition: null,
      specialRange: 2,
    });
    const ids = result.map((t) => t.shipId).sort();
    expect(ids).toEqual([1, 2, 3]);
    expect(result.find((t) => t.shipId === 1)).toEqual({ shipId: 1, row: 5, col: 5 });
  });

  it("uses the ship's field range when it is larger than 2", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: [pos(1, 5, 5, true), pos(4, 5, 10, false)],
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: [],
      selectedWeaponType: "special",
      specialType: 1,
      shipVariant: 2,
      previewPosition: null,
      specialRange: 5,
    });
    expect(result.map((t) => t.shipId).sort()).toEqual([1, 4]);
  });

  it("does not treat variant 1 EMP as a field that hits friendlies", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: [pos(1, 5, 5, true), pos(2, 5, 6, true)],
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: [{ shipId: 2, position: { row: 5, col: 6 } }],
      selectedWeaponType: "special",
      specialType: 1,
      shipVariant: 1,
      previewPosition: null,
    });
    expect(result.map((t) => t.shipId)).not.toContain(1);
  });
});

describe("collectDamageLabelTargets — Repair Drones vs Attack Drones", () => {
  function pos(shipId: number, row: number, col: number, isCreator: boolean): GridShipPosition {
    return { shipId, position: { row, col }, isCreator };
  }

  const friendliesAndEnemy = [
    pos(1, 5, 5, true),
    pos(2, 5, 6, true),
    pos(3, 5, 7, false),
  ];
  const bothSidesAsTargets = [
    { shipId: 2, position: { row: 5, col: 6 } },
    { shipId: 3, position: { row: 5, col: 7 } },
  ];

  it("variant 1 slot 2 (Repair Drones) labels friendlies only", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: friendliesAndEnemy,
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: bothSidesAsTargets,
      selectedWeaponType: "special",
      specialType: 2,
      shipVariant: 1,
    });
    expect(result.map((t) => t.shipId).sort()).toEqual([2]);
  });

  it("variant 2 slot 2 (Attack Drones) labels enemies only", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: friendliesAndEnemy,
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: bothSidesAsTargets,
      selectedWeaponType: "special",
      specialType: 2,
      shipVariant: 2,
    });
    expect(result.map((t) => t.shipId).sort()).toEqual([3]);
  });
});

describe("collectDamageLabelTargets — faction Repair", () => {
  function pos(shipId: number, row: number, col: number, isCreator: boolean): GridShipPosition {
    return { shipId, position: { row, col }, isCreator };
  }

  it("labels friendlies when ram mode is a heal", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: [pos(1, 5, 5, true), pos(2, 5, 6, true), pos(3, 5, 7, false)],
      selectedShipId: 1,
      targetShipId: null,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: [
        { shipId: 1, position: { row: 5, col: 5 } },
        { shipId: 2, position: { row: 5, col: 6 } },
      ],
      selectedWeaponType: "ram",
      specialType: 0,
      factionAbilityIsHeal: true,
    });
    expect(result.map((t) => t.shipId).sort()).toEqual([1, 2]);
  });

  it("still hides labels for variant 1 ram", () => {
    const result = collectDamageLabelTargets({
      grid: [],
      allShipPositions: [pos(1, 5, 5, true), pos(3, 5, 7, false)],
      selectedShipId: 1,
      targetShipId: 3,
      draggedShipId: null,
      dragOverCell: null,
      dragValidTargets: [],
      validTargets: [{ shipId: 3, position: { row: 5, col: 7 } }],
      selectedWeaponType: "ram",
      specialType: 0,
      factionAbilityIsHeal: false,
    });
    expect(result).toEqual([]);
  });
});

describe("selectedShipHasEffectLabel", () => {
  it("is true for faction Repair", () => {
    expect(
      selectedShipHasEffectLabel({
        selectedShipId: 1,
        targetShipId: null,
        selectedWeaponType: "ram",
        specialType: 0,
        shipVariant: 2,
        factionAbilityIsHeal: true,
      }),
    ).toBe(true);
  });

  it("is false for variant 1 ram", () => {
    expect(
      selectedShipHasEffectLabel({
        selectedShipId: 1,
        targetShipId: 3,
        selectedWeaponType: "ram",
        specialType: 0,
        shipVariant: 1,
        factionAbilityIsHeal: false,
      }),
    ).toBe(false);
  });
});

describe("computeConfirmWidgetAnchor — self-effect label clearance", () => {
  it("nudges the below placement off a row-0 self-heal label", () => {
    const ship: GridShipPosition = {
      shipId: 1,
      position: { row: 0, col: 8 },
      isCreator: true,
    };
    const grid = Array.from({ length: GRID_H }, () =>
      Array.from({ length: GRID_W }, () => null as GridShipPosition | null),
    );
    grid[0][8] = ship;

    const clear = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 0, col: 8 },
      selectedShipId: 1,
      targetShipId: 1,
      grid,
      selfHasEffectLabel: true,
    });
    const covered = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 0, col: 8 },
      selectedShipId: 1,
      targetShipId: 1,
      grid,
      selfHasEffectLabel: false,
    });

    expect(clear?.transform).toBe(`translate(-50%, ${3 + SELF_EFFECT_LABEL_CLEARANCE_PX}px)`);
    expect(covered?.transform).toBe("translate(-50%, 3px)");
  });
});

describe("computeConfirmWidgetAnchor — preferred vertical side", () => {
  function emptyGridWithShip(row: number, col: number) {
    const ship: GridShipPosition = {
      shipId: 1,
      position: { row, col },
      isCreator: true,
    };
    const grid = Array.from({ length: GRID_H }, () =>
      Array.from({ length: GRID_W }, () => null as GridShipPosition | null),
    );
    grid[row][col] = ship;
    return grid;
  }

  it("pins above when requested and the dest is not on the top row", () => {
    const grid = emptyGridWithShip(5, 8);
    const above = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 5, col: 8 },
      selectedShipId: 1,
      targetShipId: null,
      grid,
      preferredVertical: "above",
    });
    expect(above?.side).toBe("above");
    expect(above?.transform).toBe("translate(-50%, calc(-100% - 3px))");
  });

  it("pins below when requested", () => {
    const grid = emptyGridWithShip(5, 8);
    const below = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 5, col: 8 },
      selectedShipId: 1,
      targetShipId: null,
      grid,
      preferredVertical: "below",
    });
    expect(below?.side).toBe("below");
    expect(below?.transform).toBe("translate(-50%, 3px)");
  });

  it("ignores above on the top row so the widget stays on the board", () => {
    const grid = emptyGridWithShip(0, 8);
    const pinned = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 0, col: 8 },
      selectedShipId: 1,
      targetShipId: null,
      grid,
      preferredVertical: "above",
    });
    expect(pinned?.side).toBe("below");
  });

  it("ignores below on the bottom row so the widget stays on the board", () => {
    const grid = emptyGridWithShip(10, 8);
    const pinned = computeConfirmWidgetAnchor({
      showConfirmWidget: true,
      previewPosition: { row: 10, col: 8 },
      selectedShipId: 1,
      targetShipId: null,
      grid,
      preferredVertical: "below",
    });
    expect(pinned?.side).toBe("above");
  });
});
