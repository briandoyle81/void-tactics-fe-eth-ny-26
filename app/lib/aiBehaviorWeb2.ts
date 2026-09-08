import { ActionType, Archetype, Attributes, ScoringPosition } from "../types/types";
import type { Web2GameDataView, Web2ShipPosition } from "../types/web2Game";
import { hasLineOfSight } from "../utils/gameGridRanges";
import { SPECIAL_CONFIG } from "../utils/specialConfigWeb2";

// Server-side port of the on-chain AIBehavior.sol library (single-player AI
// turn-decision engine), adapted to web2's Web2GameDataView (number-native)
// and to web2's actual game rules where they differ from the on-chain
// version — see the Rammer note below. Kept deliberately as a cheap ordered
// priority list per archetype, same as the contract: this decides one
// ship's move; it doesn't search/plan ahead. The caller (see aiTurnWeb2.ts)
// wraps the result in a try/catch-and-Pass fallback exactly like
// SinglePlayerMatch._takeShipTurn does, since (like the contract) movement
// here is greedy axis-priority stepping that ignores obstacles/other ships
// and can occasionally produce an unreachable destination.

export interface AIDecision {
  shipId: number;
  row: number;
  col: number;
  actionType: ActionType;
  targetShipId: number;
  specialType: number;
}

interface Position {
  row: number;
  col: number;
}

interface Ctx {
  g: Web2GameDataView;
  blockedGrid: boolean[][];
  shipId: number;
  isCreatorSide: boolean; // true if the AI is playing the creator side
  pos: Position;
  attrs: Attributes;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function findAttributes(g: Web2GameDataView, shipId: number): Attributes | undefined {
  const idx = g.shipIds.indexOf(shipId);
  return idx === -1 ? undefined : g.shipAttributes[idx];
}

function findPosition(g: Web2GameDataView, shipId: number): Web2ShipPosition | undefined {
  return g.shipPositions.find((p) => p.shipId === shipId);
}

// Enemy in manhattan range + LOS, preferring lowest nonzero HP; falls back
// to a 0-HP target if every in-range enemy is already disabled.
function bestEnemyInRange(
  ctx: Ctx,
  fromPos: Position,
  range: number,
): { targetId: number; found: boolean } {
  let targetId = 0;
  let found = false;
  let bestHp = Infinity;
  let bestIsZero = false;

  for (const sp of ctx.g.shipPositions) {
    if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) {
      continue; // enemies are the opposite side from the AI
    }
    const dist = manhattan(fromPos, sp.position);
    if (dist > range) continue;
    if (dist > 1 && !hasLineOfSight(fromPos.row, fromPos.col, sp.position.row, sp.position.col, ctx.blockedGrid)) {
      continue;
    }
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs) continue;

    if (!found) {
      targetId = sp.shipId;
      found = true;
      bestHp = attrs.hullPoints;
      bestIsZero = attrs.hullPoints === 0;
      continue;
    }
    if (bestIsZero && attrs.hullPoints > 0) {
      targetId = sp.shipId;
      bestHp = attrs.hullPoints;
      bestIsZero = false;
    } else if (!bestIsZero && attrs.hullPoints > 0 && attrs.hullPoints < bestHp) {
      targetId = sp.shipId;
      bestHp = attrs.hullPoints;
    }
  }
  return { targetId, found };
}

// Injured ally (own side, not self) in range, preferring a 0-HP ally over
// the most-injured alive one.
function bestAllyToHeal(ctx: Ctx, range: number): { targetId: number; found: boolean } {
  let targetId = 0;
  let found = false;
  let bestHp = Infinity;
  let bestIsZero = false;

  for (const sp of ctx.g.shipPositions) {
    if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== ctx.isCreatorSide) continue;
    if (manhattan(ctx.pos, sp.position) > range) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs || attrs.hullPoints >= attrs.maxHullPoints) continue;

    const isZero = attrs.hullPoints === 0;
    if (!found) {
      targetId = sp.shipId;
      found = true;
      bestHp = attrs.hullPoints;
      bestIsZero = isZero;
      continue;
    }
    if (isZero && !bestIsZero) {
      targetId = sp.shipId;
      bestHp = attrs.hullPoints;
      bestIsZero = true;
    } else if (isZero === bestIsZero && attrs.hullPoints < bestHp) {
      targetId = sp.shipId;
      bestHp = attrs.hullPoints;
    }
  }
  return { targetId, found };
}

// Web2's Ram (see gameEngineWeb2.ts's ActionType.Ram case) isn't limited to
// an adjacent tile like web3's RamResolver (range 1, fixed) — the rammer
// can move up to its full movement budget to land on a disabled enemy's
// tile. So this checks reachability by movement budget, not adjacency.
function zeroHPEnemyReachable(ctx: Ctx): { targetId: number; targetPos: Position | null; found: boolean } {
  let best: { targetId: number; targetPos: Position } | null = null;
  let bestDist = Infinity;
  for (const sp of ctx.g.shipPositions) {
    if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
    const dist = manhattan(ctx.pos, sp.position);
    if (dist > ctx.attrs.movement) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs || attrs.hullPoints !== 0) continue;
    if (dist < bestDist) {
      best = { targetId: sp.shipId, targetPos: sp.position };
      bestDist = dist;
    }
  }
  return best
    ? { targetId: best.targetId, targetPos: best.targetPos, found: true }
    : { targetId: 0, targetPos: null, found: false };
}

function nearestEnemyPosition(ctx: Ctx, preferZeroHP: boolean): { pos: Position | null; found: boolean } {
  const scan = (zeroOnly: boolean): { pos: Position | null; found: boolean } => {
    let best: Position | null = null;
    let bestDist = Infinity;
    for (const sp of ctx.g.shipPositions) {
      if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
      if (zeroOnly) {
        const attrs = findAttributes(ctx.g, sp.shipId);
        if (!attrs || attrs.hullPoints !== 0) continue;
      }
      const dist = manhattan(ctx.pos, sp.position);
      if (dist < bestDist) {
        best = sp.position;
        bestDist = dist;
      }
    }
    return { pos: best, found: best !== null };
  };
  if (preferZeroHP) {
    const zero = scan(true);
    if (zero.found) return zero;
  }
  return scan(false);
}

function nearestScoringTile(scoringPositions: ScoringPosition[], myPos: Position): { pos: Position | null; found: boolean } {
  let best: Position | null = null;
  let bestDist = Infinity;
  for (const sp of scoringPositions) {
    const candidate = { row: sp.row, col: sp.col };
    const dist = manhattan(myPos, candidate);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return { pos: best, found: best !== null };
}

// Greedy axis-priority step toward target, clamped to movement budget —
// same shape as AIBehavior.sol's _stepToward. Ignores obstacles/occupancy;
// the caller's try/catch-and-Pass fallback absorbs the rare illegal result.
function stepToward(from: Position, to: Position, movement: number): Position {
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const rowDist = Math.abs(rowDelta);
  const colDist = Math.abs(colDelta);

  let budget = movement;
  let rowStep = 0;
  let colStep = 0;
  if (rowDist >= colDist) {
    const useRow = Math.min(rowDist, budget);
    rowStep = rowDelta < 0 ? -useRow : useRow;
    budget -= useRow;
    const useCol = Math.min(colDist, budget);
    colStep = colDelta < 0 ? -useCol : useCol;
  } else {
    const useCol = Math.min(colDist, budget);
    colStep = colDelta < 0 ? -useCol : useCol;
    budget -= useCol;
    const useRow = Math.min(rowDist, budget);
    rowStep = rowDelta < 0 ? -useRow : useRow;
  }
  return { row: from.row + rowStep, col: from.col + colStep };
}

function stepAway(
  from: Position,
  threat: Position,
  movement: number,
  gridHeight: number,
  gridWidth: number,
): Position {
  let awayRow = from.row + (from.row - threat.row);
  let awayCol = from.col + (from.col - threat.col);
  if (awayRow < 0) awayRow = 0;
  if (awayRow >= gridHeight) awayRow = gridHeight - 1;
  if (awayCol < 0) awayCol = 0;
  if (awayCol >= gridWidth) awayCol = gridWidth - 1;
  return stepToward(from, { row: awayRow, col: awayCol }, movement);
}

// ---- per-archetype rule lists (mirrors AIBehavior.sol) ----

function decideEngageOrApproach(ctx: Ctx): AIDecision {
  const base = { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };

  const { targetId, found } = bestEnemyInRange(ctx, ctx.pos, ctx.attrs.range);
  if (found) return { ...base, actionType: ActionType.Shoot, targetShipId: targetId };

  const { pos: enemyPos, found: enemyFound } = nearestEnemyPosition(ctx, false);
  if (!enemyFound) return base;

  const newPos = stepToward(ctx.pos, enemyPos!, ctx.attrs.movement);
  const result = { ...base, row: newPos.row, col: newPos.col };
  const { targetId: target2, found: found2 } = bestEnemyInRange(ctx, newPos, ctx.attrs.range);
  if (found2) return { ...result, actionType: ActionType.Shoot, targetShipId: target2 };
  return result;
}

function decideSniper(ctx: Ctx, gridHeight: number, gridWidth: number): AIDecision {
  const base = { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };

  const { pos: enemyPos, found: enemyFound } = nearestEnemyPosition(ctx, false);
  if (!enemyFound) return base;
  const dist = manhattan(ctx.pos, enemyPos!);

  if (dist > 1) {
    const { targetId, found } = bestEnemyInRange(ctx, ctx.pos, ctx.attrs.range);
    if (found) return { ...base, actionType: ActionType.Shoot, targetShipId: targetId };

    const newPos = stepToward(ctx.pos, enemyPos!, ctx.attrs.movement);
    const result = { ...base, row: newPos.row, col: newPos.col };
    const { targetId: target2, found: found2 } = bestEnemyInRange(ctx, newPos, ctx.attrs.range);
    if (found2) return { ...result, actionType: ActionType.Shoot, targetShipId: target2 };
    return result;
  }

  const awayPos = stepAway(ctx.pos, enemyPos!, ctx.attrs.movement, gridHeight, gridWidth);
  return { ...base, row: awayPos.row, col: awayPos.col };
}

function decideSupport(ctx: Ctx, hasRepairDrones: boolean): AIDecision {
  const base = { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };

  if (hasRepairDrones) {
    const healRange = SPECIAL_CONFIG[2]!.range; // Repair
    const { targetId, found } = bestAllyToHeal(ctx, healRange);
    if (found) return { ...base, actionType: ActionType.Special, targetShipId: targetId, specialType: 2 };
  }

  const { targetId, found } = bestEnemyInRange(ctx, ctx.pos, ctx.attrs.range);
  if (found) return { ...base, actionType: ActionType.Shoot, targetShipId: targetId };

  const { targetId: allyTarget, found: allyFound } = bestAllyToHeal(ctx, Infinity);
  if (!allyFound) return base;
  const allyPos = findPosition(ctx.g, allyTarget);
  if (!allyPos) return base;
  const newPos = stepToward(ctx.pos, allyPos.position, ctx.attrs.movement);
  return { ...base, row: newPos.row, col: newPos.col };
}

function decideTurtle(ctx: Ctx, scoringPositions: ScoringPosition[]): AIDecision {
  const base = { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };

  const { targetId, found } = bestEnemyInRange(ctx, ctx.pos, ctx.attrs.range);
  if (found) return { ...base, actionType: ActionType.Shoot, targetShipId: targetId };

  const { pos: tilePos, found: tileFound } = nearestScoringTile(scoringPositions, ctx.pos);
  if (!tileFound) return base;
  const newPos = stepToward(ctx.pos, tilePos!, ctx.attrs.movement);
  return { ...base, row: newPos.row, col: newPos.col };
}

function decideRammer(ctx: Ctx): AIDecision {
  const base = { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };

  const ram = zeroHPEnemyReachable(ctx);
  if (ram.found && ram.targetPos) {
    return { ...base, row: ram.targetPos.row, col: ram.targetPos.col, actionType: ActionType.Ram, targetShipId: ram.targetId };
  }

  const { targetId, found } = bestEnemyInRange(ctx, ctx.pos, ctx.attrs.range);
  if (found) return { ...base, actionType: ActionType.Shoot, targetShipId: targetId };

  const { pos: enemyPos, found: enemyFound } = nearestEnemyPosition(ctx, true);
  if (!enemyFound) return base;
  const newPos = stepToward(ctx.pos, enemyPos!, ctx.attrs.movement);
  const result = { ...base, row: newPos.row, col: newPos.col };
  const { targetId: target2, found: found2 } = bestEnemyInRange(ctx, newPos, ctx.attrs.range);
  if (found2) return { ...result, actionType: ActionType.Shoot, targetShipId: target2 };
  return result;
}

export interface DecideAIMoveParams {
  g: Web2GameDataView;
  blockedGrid: boolean[][];
  scoringPositions: ScoringPosition[];
  shipId: number;
  archetype: Archetype;
  isCreatorSide: boolean;
  hasRepairDrones: boolean;
}

/** Decides one AI ship's move. Callers must wrap execution in a try/catch-and-Pass fallback (see aiTurnWeb2.ts). */
export function decideAIMove(params: DecideAIMoveParams): AIDecision | null {
  const { g, blockedGrid, scoringPositions, shipId, archetype, isCreatorSide, hasRepairDrones } = params;
  const shipPos = findPosition(g, shipId);
  const attrs = findAttributes(g, shipId);
  if (!shipPos || !attrs) return null;

  const ctx: Ctx = { g, blockedGrid, shipId, isCreatorSide, pos: shipPos.position, attrs };

  switch (archetype) {
    case Archetype.Grunt:
    case Archetype.Aggressor:
      return decideEngageOrApproach(ctx);
    case Archetype.Sniper:
      return decideSniper(ctx, g.gridDimensions.gridHeight, g.gridDimensions.gridWidth);
    case Archetype.Support:
      return decideSupport(ctx, hasRepairDrones);
    case Archetype.Turtle:
      return decideTurtle(ctx, scoringPositions);
    case Archetype.Rammer:
      return decideRammer(ctx);
    default:
      return decideEngageOrApproach(ctx);
  }
}
