import { describe, it, expect } from "vitest";
import { decideAIMove, type DecideAIMoveParams } from "../aiBehaviorWeb2";
import { ActionType, Archetype, Attributes, ScoringPosition } from "../../types/types";
import type { Web2GameDataView, Web2ShipPosition } from "../../types/web2Game";

// Regression coverage for the web2 AI port of Variant1AI.sol/Variant2AI.sol
// (see docs/ai-behavior-registry.md). The AI is always the joiner
// (isCreatorSide: false), so "enemy" ships are isCreator: true.

function makeAttrs(overrides: Partial<Attributes> = {}): Attributes {
  return {
    version: 1,
    range: 3,
    gunDamage: 20,
    hullPoints: 100,
    maxHullPoints: 100,
    movement: 4,
    damageReduction: 0,
    reactorCriticalTimer: 0,
    statusEffects: [],
    ...overrides,
  };
}

interface ShipSpec {
  id: number;
  row: number;
  col: number;
  isCreator: boolean;
  attrs?: Partial<Attributes>;
  status?: 0 | 1 | 2;
}

function makeGame(ships: ShipSpec[]): Web2GameDataView {
  const shipIds = ships.map((s) => s.id);
  const shipAttributes = ships.map((s) => makeAttrs(s.attrs));
  const shipPositions: Web2ShipPosition[] = ships.map((s) => ({
    shipId: s.id,
    position: { row: s.row, col: s.col },
    isCreator: s.isCreator,
    status: s.status ?? 0,
  }));
  return {
    metadata: {
      gameId: 1,
      lobbyId: 1,
      creator: "creator",
      joiner: "joiner",
      creatorFleetId: 1,
      joinerFleetId: 2,
      creatorGoesFirst: true,
      startedAt: 0,
      winner: "",
    },
    turnState: { currentTurn: "joiner", turnTime: 120, turnStartTime: 0, currentRound: 1 },
    gridDimensions: { gridWidth: 17, gridHeight: 11 },
    mapId: 1,
    maxScore: 50,
    creatorScore: 0,
    joinerScore: 0,
    shipIds,
    shipAttributes,
    shipPositions,
    creatorActiveShipIds: ships.filter((s) => s.isCreator && (s.status ?? 0) === 0).map((s) => s.id),
    joinerActiveShipIds: ships.filter((s) => !s.isCreator && (s.status ?? 0) === 0).map((s) => s.id),
    creatorMovedShipIds: [],
    joinerMovedShipIds: [],
  };
}

const BLOCKED_GRID: boolean[][] = Array.from({ length: 11 }, () => Array(17).fill(false));

function decide(
  g: Web2GameDataView,
  shipId: number,
  overrides: Partial<DecideAIMoveParams> = {},
): ReturnType<typeof decideAIMove> {
  return decideAIMove({
    g,
    blockedGrid: BLOCKED_GRID,
    scoringPositions: [],
    shipId,
    archetype: Archetype.Grunt,
    isCreatorSide: false,
    variant: 1,
    mainWeapon: 0,
    special: 0,
    ...overrides,
  });
}

describe("decideAIMove — specialType regression (the bug this port introduced and fixed)", () => {
  it("a variant 1 Support ship healing with Repair Drones sets specialType to the slot actually used (2)", () => {
    const g = makeGame([
      { id: 1, row: 5, col: 5, isCreator: false, attrs: { hullPoints: 40, maxHullPoints: 100 } }, // injured ally
      { id: 2, row: 5, col: 6, isCreator: false }, // healer, adjacent
    ]);
    const decision = decide(g, 2, { archetype: Archetype.Support, special: 2 });
    expect(decision?.actionType).toBe(ActionType.Special);
    expect(decision?.specialType).toBe(2);
    expect(decision?.targetShipId).toBe(1);
  });

  it("a variant 2 Grunt's Drone Swarm sets specialType to 2, not the default 0", () => {
    // Support's fallback tree never reaches for a special (mirrors
    // Variant2AI.sol's _support), so this exercises brawlV2 -> fightFromV2,
    // the path that actually calls swarmFromV2: the ship has to close in
    // (movement 4) before the enemy at distance 7 falls inside Drone
    // Swarm's range-5 reach, since it starts outside gun range (1) too.
    const g = makeGame([
      { id: 1, row: 5, col: 12, isCreator: true }, // enemy out of gun range but in swarm range after advancing
      { id: 2, row: 5, col: 5, isCreator: false, attrs: { range: 1 } },
    ]);
    const decision = decide(g, 2, { variant: 2, archetype: Archetype.Grunt, special: 2 });
    expect(decision?.actionType).toBe(ActionType.Special);
    expect(decision?.specialType).toBe(2);
    expect(decision?.targetShipId).toBe(1);
  });
});

describe("decideAIMove — variant 1 ram-on-objective (every archetype, checked first)", () => {
  it("rams a downed enemy standing on a scoring tile before its own archetype tree runs", () => {
    const g = makeGame([
      { id: 1, row: 5, col: 6, isCreator: true, attrs: { hullPoints: 0 } }, // downed enemy on the scoring tile
      { id: 2, row: 5, col: 4, isCreator: false, attrs: { movement: 4 } }, // Sniper archetype would normally kite
    ]);
    const scoringPositions: ScoringPosition[] = [{ row: 5, col: 6, points: 1, onlyOnce: false }];
    const decision = decide(g, 2, { archetype: Archetype.Sniper, scoringPositions });
    expect(decision?.actionType).toBe(ActionType.FactionAbility);
    expect(decision?.targetShipId).toBe(1);
  });

  it("does not ram when its own reactor timer is already at 2 (one more tick would destroy it)", () => {
    const g = makeGame([
      { id: 1, row: 5, col: 6, isCreator: true, attrs: { hullPoints: 0 } },
      { id: 2, row: 5, col: 4, isCreator: false, attrs: { reactorCriticalTimer: 2 } },
    ]);
    const scoringPositions: ScoringPosition[] = [{ row: 5, col: 6, points: 1, onlyOnce: false }];
    const decision = decide(g, 2, { scoringPositions });
    expect(decision?.actionType).not.toBe(ActionType.FactionAbility);
  });
});

describe("decideAIMove — variant 2 heal-on-scoring-tile (priority 1, every archetype)", () => {
  it("repairs a disabled friendly on a scoring tile ahead of fighting", () => {
    const g = makeGame([
      { id: 1, row: 5, col: 6, isCreator: false, attrs: { hullPoints: 0 } }, // disabled ally on the tile
      { id: 2, row: 5, col: 4, isCreator: false }, // healer
      { id: 3, row: 5, col: 12, isCreator: true }, // an enemy also on the board
    ]);
    const scoringPositions: ScoringPosition[] = [{ row: 5, col: 6, points: 1, onlyOnce: false }];
    const decision = decide(g, 2, { variant: 2, archetype: Archetype.Aggressor, scoringPositions });
    expect(decision?.actionType).toBe(ActionType.FactionAbility);
    expect(decision?.targetShipId).toBe(1);
  });
});

describe("decideAIMove — variant 2 claims an unclaimed scoring tile before fighting", () => {
  it("heads for the nearest unclaimed scoring tile rather than chasing an enemy", () => {
    const g = makeGame([
      { id: 1, row: 5, col: 4, isCreator: false, attrs: { movement: 4 } },
      { id: 2, row: 0, col: 0, isCreator: true }, // far-away enemy, no threat this turn
    ]);
    const scoringPositions: ScoringPosition[] = [{ row: 5, col: 8, points: 1, onlyOnce: false }];
    const decision = decide(g, 1, { variant: 2, archetype: Archetype.Grunt, scoringPositions });
    // Should move toward the tile (col 4 -> higher col), not toward the enemy (which would decrease col/row).
    expect(decision?.col).toBeGreaterThan(4);
  });
});

describe("decideAIMove — falls back to a Pass-like hold when nothing else applies", () => {
  it("a lone ship with nothing to fight or claim holds position", () => {
    const g = makeGame([{ id: 1, row: 5, col: 8, isCreator: false }]);
    const decision = decide(g, 1);
    expect(decision?.row).toBe(5);
    expect(decision?.col).toBe(8);
    expect(decision?.actionType).toBe(ActionType.Pass);
  });

  it("returns null for a ship not found in the game state", () => {
    const g = makeGame([{ id: 1, row: 5, col: 8, isCreator: false }]);
    expect(decide(g, 999)).toBeNull();
  });
});
