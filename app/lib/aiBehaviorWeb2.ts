import { ActionType, Archetype, Attributes, ScoringPosition } from "../types/types";
import type { Web2GameDataView, Web2ShipPosition } from "../types/web2Game";
import { hasLineOfSight } from "../utils/gameGridRanges";
import { getSpecialConfigWeb2 } from "../utils/specialConfigWeb2";
import { getFactionAbilityConfigWeb2 } from "../utils/factionAbilityConfigWeb2";

// Server-side port of the on-chain per-variant AI (Variant1AI.sol /
// Variant2AI.sol, composed from the shared AIBehavior.sol library —
// see docs/ai-behavior-registry.md), adapted to web2's Web2GameDataView
// (number-native) the same way gameEngineWeb2.ts ports the resolvers.
// Which faction a ship belongs to is its own traits.variant — see
// aiTurnWeb2.ts, which reads it from the DB and passes it in here, exactly
// like SinglePlayerMatch/RoguelikeMatch dispatch through AIBehaviorRegistry
// on-chain. Kept as a cheap ordered priority list per archetype, same as
// the contracts: this decides one ship's move; it doesn't search/plan
// ahead. The caller (aiTurnWeb2.ts) wraps the result in a try/catch-and-Pass
// fallback exactly like SinglePlayerMatch._takeShipTurn does, since (like
// the contracts) movement here is greedy axis-priority stepping that
// ignores obstacles/other ships and can occasionally produce an
// unreachable destination.

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
  mainWeapon: number; // 0=Generic, 1=Sniper, 2=Missile, 3=Close
  scoringPositions: ScoringPosition[];
  gridWidth: number;
  gridHeight: number;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function findPosition(g: Web2GameDataView, shipId: number): Web2ShipPosition | undefined {
  return g.shipPositions.find((p) => p.shipId === shipId);
}

function findAttributes(g: Web2GameDataView, shipId: number): Attributes | undefined {
  const idx = g.shipIds.indexOf(shipId);
  return idx === -1 ? undefined : g.shipAttributes[idx];
}

function isScoringTile(scoringPositions: ScoringPosition[], p: Position): boolean {
  return scoringPositions.some((sp) => sp.row === p.row && sp.col === p.col);
}

function isOccupiedByOther(ctx: Ctx, p: Position): boolean {
  return ctx.g.shipPositions.some(
    (sp) => sp.shipId !== ctx.shipId && sp.status === 0 && sp.position.row === p.row && sp.position.col === p.col,
  );
}

// Greedy axis-priority step toward target, clamped to movement budget —
// same shape as AIBehavior.sol's _stepToward.
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

// Spend up to `budget` steps moving directly away from `threat` (every step
// along either axis away from it adds one tile of distance), taking the
// axis with the larger separation first — lets a ship retreat all the way
// out to its maximum range, not just mirror-step one hop away. Mirrors
// AIBehavior.sol's _retreatStep.
function retreatStep(ctx: Ctx, threat: Position, budget: number): Position {
  const p = { row: ctx.pos.row, col: ctx.pos.col };
  const dRow = p.row - threat.row;
  const dCol = p.col - threat.col;
  const rowFirst = Math.abs(dRow) >= Math.abs(dCol);
  for (let pass = 0; pass < 2 && budget > 0; pass++) {
    const useRow = pass === 0 === rowFirst;
    const pos = useRow ? p.row : p.col;
    const delta = useRow ? dRow : dCol;
    const limit = useRow ? ctx.gridHeight : ctx.gridWidth;
    const dir = delta > 0 ? 1 : delta < 0 ? -1 : pos < limit / 2 ? 1 : -1;
    const room = dir > 0 ? limit - 1 - pos : pos;
    const use = Math.min(Math.max(room, 0), budget);
    if (use === 0) continue;
    if (useRow) p.row += dir * use;
    else p.col += dir * use;
    budget -= use;
  }
  return p;
}

// Enemy (opposing side) in manhattan range, preferring one on a scoring
// tile over one that isn't (regardless of HP), then lowest nonzero HP,
// falling back to a 0-HP target if every in-range enemy in that tier is
// already disabled. LOS is required past range 1 unless `needsLineOfSight`
// is false (some specials, e.g. Drone Swarm, don't need it). Mirrors
// AIBehavior.sol's _bestEnemyWithin.
function bestEnemyWithin(
  ctx: Ctx,
  fromPos: Position,
  range: number,
  needsLineOfSight: boolean,
): { targetId: number; found: boolean } {
  let targetId = 0;
  let found = false;
  let bestHp = Infinity;
  let bestIsZero = false;
  let bestOnTile = false;

  for (const sp of ctx.g.shipPositions) {
    if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
    const dist = manhattan(fromPos, sp.position);
    if (dist > range) continue;
    if (needsLineOfSight && dist > 1 && !hasLineOfSight(fromPos.row, fromPos.col, sp.position.row, sp.position.col, ctx.blockedGrid)) {
      continue;
    }
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs) continue;
    const onTile = isScoringTile(ctx.scoringPositions, sp.position);

    if (!found) {
      targetId = sp.shipId;
      found = true;
      bestHp = attrs.hullPoints;
      bestIsZero = attrs.hullPoints === 0;
      bestOnTile = onTile;
      continue;
    }
    if (onTile !== bestOnTile) {
      if (onTile) {
        targetId = sp.shipId;
        bestHp = attrs.hullPoints;
        bestIsZero = attrs.hullPoints === 0;
        bestOnTile = true;
      }
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
// the most-injured alive one. Mirrors AIBehavior.sol's _bestAllyToHeal.
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

// Nearest enemy already at 0 HP (a downed ship still on the board).
function nearestDownedEnemy(ctx: Ctx): { id: number; pos: Position | null; found: boolean } {
  let id = 0;
  let pos: Position | null = null;
  let found = false;
  let bestDist = Infinity;
  for (const sp of ctx.g.shipPositions) {
    if (sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs || attrs.hullPoints !== 0) continue;
    const dist = manhattan(ctx.pos, sp.position);
    if (!found || dist < bestDist) {
      id = sp.shipId;
      pos = sp.position;
      found = true;
      bestDist = dist;
    }
  }
  return { id, pos, found };
}

// An enemy within `range` of `from` whose reactor timer is already at 2+:
// one more tick destroys it, whatever its hull.
function doomedEnemyWithin(ctx: Ctx, from: Position, range: number): { id: number; found: boolean } {
  for (const sp of ctx.g.shipPositions) {
    if (sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
    if (manhattan(from, sp.position) > range) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (attrs && attrs.reactorCriticalTimer >= 2) return { id: sp.shipId, found: true };
  }
  return { id: 0, found: false };
}

// Picks a scoring-tile movement target. Preference order: (1) an unclaimed
// tile on this ship's weapon-range-appropriate side of the grid — long
// range (Sniper/Missile) sticks to its own (high-column, joiner) side,
// short range pushes toward the midline — nearest first; (2) an unclaimed
// tile on either side, nearest first; (3) any tile at all, even a claimed
// one, so there's always somewhere to head. Mirrors _bestScoringTile.
function bestScoringTile(ctx: Ctx): { pos: Position | null; found: boolean } {
  const midCol = ctx.gridWidth / 2;
  const longRange = ctx.mainWeapon === 1 || ctx.mainWeapon === 2; // Sniper or Missile

  for (let pass = 0; pass < 3; pass++) {
    let best: Position | null = null;
    let bestDist = Infinity;
    for (const sp of ctx.scoringPositions) {
      const candidate = { row: sp.row, col: sp.col };
      if (pass < 2 && isOccupiedByOther(ctx, candidate)) continue;
      if (pass === 0) {
        const onOwnSide = longRange ? candidate.col >= midCol : candidate.col <= midCol;
        if (!onOwnSide) continue;
      }
      const dist = manhattan(ctx.pos, candidate);
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    if (best) return { pos: best, found: true };
  }
  return { pos: null, found: false };
}

// Any other living ally that could reach this position under its own
// movement stat this turn.
function allyCanCoverTile(ctx: Ctx): boolean {
  return ctx.g.shipPositions.some((sp) => {
    if (sp.shipId === ctx.shipId || sp.status !== 0 || sp.isCreator !== ctx.isCreatorSide) return false;
    const attrs = findAttributes(ctx.g, sp.shipId);
    return !!attrs && manhattan(sp.position, ctx.pos) <= attrs.movement;
  });
}

// Any living enemy whose weapon range (with LOS) already reaches the given
// tile from its current position.
function enemyThreatensTile(ctx: Ctx, tilePos: Position): boolean {
  return ctx.g.shipPositions.some((sp) => {
    if (sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) return false;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs) return false;
    const dist = manhattan(sp.position, tilePos);
    if (dist > attrs.range) return false;
    if (dist > 1 && !hasLineOfSight(sp.position.row, sp.position.col, tilePos.row, tilePos.col, ctx.blockedGrid)) return false;
    return true;
  });
}

// True when this ship is on a scoring tile and should hold it rather than
// be lured away — overridden only when leaving is genuinely free: it could
// still get a shot by moving anyway, another ally can cover the tile, and
// no enemy currently threatens it. Mirrors _shouldHoldScoringTile.
function shouldHoldScoringTile(ctx: Ctx): boolean {
  if (!isScoringTile(ctx.scoringPositions, ctx.pos)) return false;
  const { pos: enemyPos, found: enemyFound } = nearestEnemyPosition(ctx, false);
  if (enemyFound && enemyPos) {
    const stepped = stepToward(ctx.pos, enemyPos, ctx.attrs.movement);
    const { found: couldShoot } = bestEnemyWithin(ctx, stepped, ctx.attrs.range, true);
    if (couldShoot && allyCanCoverTile(ctx) && !enemyThreatensTile(ctx, ctx.pos)) {
      return false;
    }
  }
  return true;
}

function holdDecision(ctx: Ctx): AIDecision {
  return { shipId: ctx.shipId, row: ctx.pos.row, col: ctx.pos.col, actionType: ActionType.Pass, targetShipId: 0, specialType: 0 };
}

function toDecision(
  ctx: Ctx,
  dest: Position,
  actionType: ActionType,
  targetShipId: number,
  specialType: number = 0,
): AIDecision {
  // gameEngineWeb2.ts's ActionType.Special case reads `specialType` to know
  // which of the ship's slots to resolve — every "use a special" decision
  // below must pass the real equipped slot, not the default 0.
  return { shipId: ctx.shipId, row: dest.row, col: dest.col, actionType, targetShipId, specialType };
}

// Shared fallback movement used once a ship's primary directive (shoot,
// heal, retreat) didn't produce a decision: close on the nearest enemy, but
// only follow through if it would actually bring one into range this turn
// — otherwise redirect toward a scoring tile instead. Falls back to the
// enemy-directed step if no scoring tile exists at all. Mirrors
// _approachOrSeekTile.
function approachOrSeekTile(ctx: Ctx, enemyPos: Position | null, enemyFound: boolean): AIDecision {
  let towardEnemy = ctx.pos;
  if (enemyFound && enemyPos) {
    towardEnemy = stepToward(ctx.pos, enemyPos, ctx.attrs.movement);
    const { targetId, found } = bestEnemyWithin(ctx, towardEnemy, ctx.attrs.range, true);
    if (found) return toDecision(ctx, towardEnemy, ActionType.Shoot, targetId);
  }

  const { pos: tilePos, found: tileFound } = bestScoringTile(ctx);
  if (tileFound && tilePos) {
    const towardTile = stepToward(ctx.pos, tilePos, ctx.attrs.movement);
    return toDecision(ctx, towardTile, ActionType.Pass, 0);
  }

  if (enemyFound) return toDecision(ctx, towardEnemy, ActionType.Pass, 0);
  return holdDecision(ctx);
}

function idleOrSeekTile(ctx: Ctx): AIDecision {
  if (shouldHoldScoringTile(ctx)) return holdDecision(ctx);
  return approachOrSeekTile(ctx, ctx.pos, false);
}

// Where to stand to shoot the nearest enemy from as far away as this ship's
// range allows: out of range -> step toward it, but only as far as reaches
// maximum range; already inside range -> back away (if allowed) toward
// maximum range. A blocked destination means "stay put". Mirrors
// standoffPosition.
function standoffPosition(ctx: Ctx, enemyPos: Position, allowRetreat: boolean): Position {
  const d = manhattan(ctx.pos, enemyPos);
  const range = ctx.attrs.range;
  let stand: Position;
  if (d > range) {
    stand = stepToward(ctx.pos, enemyPos, Math.min(d - range, ctx.attrs.movement));
  } else if (allowRetreat) {
    const budget = Math.min(range - d, ctx.attrs.movement);
    if (budget === 0) return ctx.pos;
    stand = retreatStep(ctx, enemyPos, budget);
  } else {
    return ctx.pos;
  }
  return isOccupiedByOther(ctx, stand) ? ctx.pos : stand;
}

// Close on `target` at up to `maxSteps`, but never onto (or past) its tile:
// stop adjacent at the nearest reachable spot, backing off one step at a
// time if the landing square is already taken. Mirrors advanceToward.
function advanceToward(ctx: Ctx, target: Position, maxSteps: number): Position {
  const dist = manhattan(ctx.pos, target);
  if (dist <= 1) return ctx.pos;
  let steps = Math.min(dist - 1, maxSteps);
  while (steps > 0) {
    const dest = stepToward(ctx.pos, target, steps);
    if (!isOccupiedByOther(ctx, dest)) return dest;
    steps--;
  }
  return ctx.pos;
}

// Step toward `target` with the full movement budget, landing on the
// nearest free square along the way (the target tile itself included).
// Mirrors _moveToward.
function moveToward(ctx: Ctx, target: Position): Position {
  let steps = Math.min(manhattan(ctx.pos, target), ctx.attrs.movement);
  while (steps > 0) {
    const dest = stepToward(ctx.pos, target, steps);
    if (!isOccupiedByOther(ctx, dest)) return dest;
    steps--;
  }
  return ctx.pos;
}

// The objective step (variant 2): on a scoring tile already -> stay; else
// if an unclaimed scoring tile exists -> head for it at full speed; else
// nothing to claim. Mirrors claimScoringTile.
function claimScoringTile(ctx: Ctx): { stand: Position; objective: boolean } {
  if (isScoringTile(ctx.scoringPositions, ctx.pos)) return { stand: ctx.pos, objective: true };
  const { pos: tile, found } = bestScoringTile(ctx);
  if (!found || !tile || isOccupiedByOther(ctx, tile)) return { stand: ctx.pos, objective: false };
  return { stand: moveToward(ctx, tile), objective: true };
}

// Tally of the live ships within `range` of `center` (excluding this one),
// for area specials: how many enemies, how many are finishable (0 HP or
// reactor timer 2+), and how many allies are in it / already near
// destruction. Mirrors the Sweep struct/sweep().
interface Sweep {
  enemies: number;
  finishableEnemies: number;
  allies: number;
  alliesAtRisk: number;
}

function sweep(ctx: Ctx, center: Position, range: number): Sweep {
  const s: Sweep = { enemies: 0, finishableEnemies: 0, allies: 0, alliesAtRisk: 0 };
  for (const sp of ctx.g.shipPositions) {
    if (sp.shipId === ctx.shipId || sp.status !== 0) continue;
    if (manhattan(center, sp.position) > range) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs) continue;
    if (sp.isCreator !== ctx.isCreatorSide) {
      s.enemies++;
      if (attrs.hullPoints === 0 || attrs.reactorCriticalTimer >= 2) s.finishableEnemies++;
    } else {
      s.allies++;
      if (attrs.reactorCriticalTimer >= 2) s.alliesAtRisk++;
    }
  }
  return s;
}

// A tile this ship can legally end its move on: reachable within its
// movement, in bounds, not occupied by another ship. A scoring tile beats a
// plain one, then the shortest move. Mirrors the Stand struct/_standTile.
function standTile(ctx: Ctx, target: Position, range: number): { pos: Position; found: boolean } {
  let best: Position | null = null;
  let bestScoring = false;
  let bestDist = Infinity;
  for (let dr = -range; dr <= range; dr++) {
    const rem = range - Math.abs(dr);
    for (let dc = -rem; dc <= rem; dc++) {
      const t = { row: target.row + dr, col: target.col + dc };
      if (t.row < 0 || t.col < 0 || t.row >= ctx.gridHeight || t.col >= ctx.gridWidth) continue;
      const dist = manhattan(ctx.pos, t);
      if (dist > ctx.attrs.movement) continue;
      if (dist !== 0 && isOccupiedByOther(ctx, t)) continue;
      const scoring = isScoringTile(ctx.scoringPositions, t);
      if (!best || (scoring && !bestScoring) || (scoring === bestScoring && dist < bestDist)) {
        best = t;
        bestScoring = scoring;
        bestDist = dist;
      }
    }
  }
  return best ? { pos: best, found: true } : { pos: ctx.pos, found: false };
}

// Ram, for every variant-1 ship: an enemy at 0 HP AND standing on a scoring
// tile is worth evicting. Finds the nearest such enemy this ship can ram
// this turn, moving to a free tile within `ramRange` of it if needed.
// Mirrors ramOnScoringTile.
function ramOnScoringTile(ctx: Ctx, ramRange: number): { decision: AIDecision | null; found: boolean } {
  let best: AIDecision | null = null;
  let bestDist = Infinity;
  let found = false;
  for (const sp of ctx.g.shipPositions) {
    if (sp.status !== 0 || sp.isCreator !== !ctx.isCreatorSide) continue;
    const attrs = findAttributes(ctx.g, sp.shipId);
    if (!attrs || attrs.hullPoints !== 0) continue;
    if (!isScoringTile(ctx.scoringPositions, sp.position)) continue;
    const dist = manhattan(ctx.pos, sp.position);
    if (found && dist >= bestDist) continue;
    const s = standTile(ctx, sp.position, ramRange);
    if (!s.found) continue;
    best = toDecision(ctx, s.pos, ActionType.FactionAbility, sp.shipId);
    bestDist = dist;
    found = true;
  }
  return { decision: best, found };
}

// Which ships a heal may pick and whether the healer may move to reach
// them. Mirrors the HealFilter struct.
interface HealFilter {
  scoringOnly: boolean;
  disabledOnly: boolean;
  includeSelf: boolean;
  canMove: boolean;
}

function healCandidate(
  ctx: Ctx,
  sp: Web2ShipPosition,
  from: Position,
  range: number,
  f: HealFilter,
): { ok: boolean; at: Position } {
  if (sp.status !== 0 || sp.isCreator !== ctx.isCreatorSide) return { ok: false, at: from };
  const isSelf = sp.shipId === ctx.shipId;
  if (isSelf && !f.includeSelf) return { ok: false, at: from };
  const attrs = findAttributes(ctx.g, sp.shipId);
  if (!attrs || attrs.hullPoints >= attrs.maxHullPoints) return { ok: false, at: from };
  if (f.disabledOnly && attrs.hullPoints !== 0) return { ok: false, at: from };
  if (f.scoringOnly && !isScoringTile(ctx.scoringPositions, sp.position)) return { ok: false, at: from };
  if (f.canMove) {
    const s = standTile(ctx, sp.position, range);
    return { ok: s.found, at: s.pos };
  }
  if (!isSelf && manhattan(from, sp.position) > range) return { ok: false, at: from };
  return { ok: true, at: from };
}

// The injured friendly ship to heal, by priority: disabled (0 HP) first,
// then lowest HP. Mirrors _planHeal + _healDecision.
function healDecision(
  ctx: Ctx,
  from: Position,
  range: number,
  healAction: ActionType,
  f: HealFilter,
): { decision: AIDecision | null; healed: boolean } {
  let id = 0;
  let stand = from;
  let found = false;
  let bestHp = 0;
  let bestDisabled = false;
  for (const sp of ctx.g.shipPositions) {
    const { ok, at } = healCandidate(ctx, sp, from, range, f);
    if (!ok) continue;
    const attrs = findAttributes(ctx.g, sp.shipId)!;
    const disabled = attrs.hullPoints === 0;
    if (found && !((disabled && !bestDisabled) || (disabled === bestDisabled && attrs.hullPoints < bestHp))) continue;
    id = sp.shipId;
    stand = at;
    found = true;
    bestHp = attrs.hullPoints;
    bestDisabled = disabled;
  }
  if (!found) return { decision: null, healed: false };
  return { decision: toDecision(ctx, stand, healAction, id), healed: true };
}

// Faction-2 heal priority 1: an injured or disabled friendly (not this one)
// standing on a scoring tile — moving within `range` of it if needed.
function healOnScoringTile(ctx: Ctx, range: number, healAction: ActionType) {
  return healDecision(ctx, ctx.pos, range, healAction, { scoringOnly: true, disabledOnly: false, includeSelf: false, canMove: true });
}

// Faction-2 heal priority 3, standing where it is (the objective step has
// already fixed where the ship ends up): a disabled friendly within range.
function healDisabledFrom(ctx: Ctx, from: Position, range: number, healAction: ActionType) {
  return healDecision(ctx, from, range, healAction, { scoringOnly: false, disabledOnly: true, includeSelf: false, canMove: false });
}

// Faction-2 heal priority 3 with no objective to claim: a disabled friendly
// it can reach this turn, moving to do so.
function healDisabledWithReach(ctx: Ctx, range: number, healAction: ActionType) {
  return healDecision(ctx, ctx.pos, range, healAction, { scoringOnly: false, disabledOnly: true, includeSelf: false, canMove: true });
}

// Faction-2 heal, last resort: this ship itself or any injured friendly
// within range of where it's about to stand.
function healAnyFrom(ctx: Ctx, from: Position, range: number, healAction: ActionType) {
  return healDecision(ctx, from, range, healAction, { scoringOnly: false, disabledOnly: false, includeSelf: true, canMove: false });
}

// Heal the most injured ally this ship can reach THIS turn: if one is
// already within `range` heal from here, else move just far enough to
// bring the healer's range onto it. Mirrors healWithReach.
function healWithReach(
  ctx: Ctx,
  range: number,
  healAction: ActionType,
  specialType: number = 0,
): { decision: AIDecision | null; healed: boolean } {
  const reach = range + ctx.attrs.movement;
  const { targetId, found } = bestAllyToHeal(ctx, reach);
  if (!found) return { decision: null, healed: false };
  const allyPos = findPosition(ctx.g, targetId)?.position;
  if (!allyPos) return { decision: null, healed: false };
  const dist = manhattan(ctx.pos, allyPos);
  const stand = dist <= range ? ctx.pos : stepToward(ctx.pos, allyPos, Math.min(dist - range, ctx.attrs.movement));
  return { decision: toDecision(ctx, stand, healAction, targetId, specialType), healed: true };
}

// The Support archetype's tree once its variant-specific healing found
// nothing: shoot an enemy in range from here if possible; otherwise seek an
// unclaimed scoring tile; otherwise close toward whichever ally most needs
// staying near. Mirrors decideSupportFallback.
function decideSupportFallback(ctx: Ctx): AIDecision {
  const { targetId, found } = bestEnemyWithin(ctx, ctx.pos, ctx.attrs.range, true);
  if (found) return toDecision(ctx, ctx.pos, ActionType.Shoot, targetId);
  if (shouldHoldScoringTile(ctx)) return holdDecision(ctx);

  let dest: Position;
  const { pos: tilePos, found: tileFound } = bestScoringTile(ctx);
  if (tileFound && tilePos) {
    dest = tilePos;
  } else {
    const { targetId: allyTarget, found: allyFound } = bestAllyToHeal(ctx, 255);
    if (!allyFound) return holdDecision(ctx);
    const allyDest = findPosition(ctx.g, allyTarget)?.position;
    if (!allyDest) return holdDecision(ctx);
    dest = allyDest;
  }
  const newPos = stepToward(ctx.pos, dest, ctx.attrs.movement);
  return toDecision(ctx, newPos, ActionType.Pass, 0);
}

// Holds/seeks unclaimed scoring tiles (weapon-range-biased); shoots
// opportunistically from wherever it ends up if an enemy is in range from
// the current position. Mirrors decideTurtle.
function decideTurtle(ctx: Ctx): AIDecision {
  const { targetId, found } = bestEnemyWithin(ctx, ctx.pos, ctx.attrs.range, true);
  if (found) return toDecision(ctx, ctx.pos, ActionType.Shoot, targetId);
  if (shouldHoldScoringTile(ctx)) return holdDecision(ctx);

  const { pos: tilePos, found: tileFound } = bestScoringTile(ctx);
  if (!tileFound || !tilePos) return holdDecision(ctx);
  if (isOccupiedByOther(ctx, tilePos) && manhattan(ctx.pos, tilePos) <= 1) return holdDecision(ctx);

  const newPos = stepToward(ctx.pos, tilePos, ctx.attrs.movement);
  return toDecision(ctx, newPos, ActionType.Pass, 0);
}

// ============================================================================
// Variant 1 (faction 1) — skirmisher: light, fast, long range. Mirrors
// Variant1AI.sol. Kit: EMP (slot 1), Repair Drones (slot 2), Flak Array
// (slot 3), innate Ram.
// ============================================================================

const EMP_SPECIAL = 1;
const HEAL_SPECIAL = 2;
const FLAK_SPECIAL = 3;

// Use an equipped attack special from `from` if it beats shooting: Flak
// Array (self-centered AoE hitting allies too — only with none in range,
// and then for 2+ enemies or 1 the gun can't reach) or EMP (finishes an
// enemy already at reactor timer 2+). Mirrors _specialFrom.
function specialFromV1(ctx: Ctx, special: number, from: Position): AIDecision | null {
  if (special === FLAK_SPECIAL) {
    const flakRange = getSpecialConfigWeb2(1, FLAK_SPECIAL)?.range ?? 0;
    const s = sweep(ctx, from, flakRange);
    if (s.allies === 0 && s.enemies > 0) {
      let worthIt = s.enemies >= 2;
      if (!worthIt) {
        const { found: gunReaches } = bestEnemyWithin(ctx, from, ctx.attrs.range, true);
        worthIt = !gunReaches;
      }
      if (worthIt) return toDecision(ctx, from, ActionType.Special, 0, FLAK_SPECIAL);
    }
  } else if (special === EMP_SPECIAL) {
    const empRange = getSpecialConfigWeb2(1, EMP_SPECIAL)?.range ?? 0;
    const { id: doomed, found } = doomedEnemyWithin(ctx, from, empRange);
    if (found) return toDecision(ctx, from, ActionType.Special, doomed, EMP_SPECIAL);
  }
  return null;
}

// Shoot from the edge of range. `retreat`: back away when an enemy is
// closer than maximum range; `leaveTiles`: may do that from a scoring
// tile. Mirrors _skirmish.
function skirmishV1(ctx: Ctx, special: number, retreat: boolean, leaveTiles: boolean): AIDecision {
  const { pos: enemyPos, found } = nearestEnemyPosition(ctx, false);
  if (!found || !enemyPos) return idleOrSeekTile(ctx);

  const stand = standoffPosition(ctx, enemyPos, retreat && (leaveTiles || !isScoringTile(ctx.scoringPositions, ctx.pos)));

  const special1 = specialFromV1(ctx, special, stand);
  if (special1) return special1;

  const { targetId, found: inRange } = bestEnemyWithin(ctx, stand, ctx.attrs.range, true);
  if (inRange) return toDecision(ctx, stand, ActionType.Shoot, targetId);
  if (isScoringTile(ctx.scoringPositions, ctx.pos) && shouldHoldScoringTile(ctx)) return holdDecision(ctx);
  return approachOrSeekTile(ctx, enemyPos, true);
}

// Heal with Repair Drones if equipped (moving just far enough to bring an
// injured ally into range), otherwise the shared Support fallback. Mirrors
// _support.
function supportV1(ctx: Ctx, special: number): AIDecision {
  if (special === HEAL_SPECIAL) {
    const healRange = getSpecialConfigWeb2(1, HEAL_SPECIAL)?.range ?? 0;
    const { decision, healed } = healWithReach(ctx, healRange, ActionType.Special, HEAL_SPECIAL);
    if (healed && decision) return decision;
  }
  return decideSupportFallback(ctx);
}

// Holds objectives like any Turtle, but lays Flak from its tile when that
// pays off. Mirrors _turtle.
function turtleV1(ctx: Ctx, special: number): AIDecision {
  const d = specialFromV1(ctx, special, ctx.pos);
  if (d) return d;
  return decideTurtle(ctx);
}

// Hunt a downed enemy — move just far enough to be within Ram's range and
// evict it — as long as this ship's own reactor timer can afford another
// tick. Otherwise fights like a Grunt. Mirrors _rammer.
function rammerV1(ctx: Ctx, special: number): AIDecision {
  if (ctx.attrs.reactorCriticalTimer <= 1) {
    const { pos: victimPos, id: victim, found } = nearestDownedEnemy(ctx);
    if (found && victimPos) {
      const ramRange = getFactionAbilityConfigWeb2(1).range;
      const reach = ramRange + ctx.attrs.movement;
      const dist = manhattan(ctx.pos, victimPos);
      if (dist <= reach) {
        let dest = ctx.pos;
        if (dist > ramRange) {
          const gap = dist - ramRange;
          dest = stepToward(ctx.pos, victimPos, Math.min(gap, ctx.attrs.movement));
        }
        return toDecision(ctx, dest, ActionType.FactionAbility, victim);
      }
    }
  }
  return skirmishV1(ctx, special, true, false);
}

function decideVariant1(ctx: Ctx, archetype: Archetype, special: number): AIDecision {
  // Every ship has Ram: evicting a downed enemy holding a scoring tile
  // outranks anything else, as long as the tick it costs is affordable.
  if (ctx.attrs.reactorCriticalTimer <= 1) {
    const ramRange = getFactionAbilityConfigWeb2(1).range;
    const { decision, found } = ramOnScoringTile(ctx, ramRange);
    if (found && decision) return decision;
  }
  if (archetype === Archetype.Support) return supportV1(ctx, special);
  if (archetype === Archetype.Turtle) return turtleV1(ctx, special);
  if (archetype === Archetype.Rammer) return rammerV1(ctx, special);
  if (archetype === Archetype.Sniper) return skirmishV1(ctx, special, true, true); // strictest kiter
  if (archetype === Archetype.Aggressor) return skirmishV1(ctx, special, false, false); // never backs off
  return skirmishV1(ctx, special, true, false); // Grunt
}

// ============================================================================
// Variant 2 (faction 2) — brawler: heavy, slow, short range, tough. Mirrors
// Variant2AI.sol. Kit: innate Repair (range 1), Electric Storm (slot 1),
// Drone Swarm (slot 2), Additional Thruster (slot 3, passive). No Ram.
// ============================================================================

const STORM_SPECIAL = 1;
const SWARM_SPECIAL = 2;

// Drone Swarm: ranged single-target damage that ignores line of sight —
// used when the guns can't reach anyone. Mirrors _swarmFrom.
function swarmFromV2(ctx: Ctx, special: number, from: Position): AIDecision | null {
  if (special !== SWARM_SPECIAL) return null;
  const swarmRange = getSpecialConfigWeb2(2, SWARM_SPECIAL)?.range ?? 0;
  const { targetId, found } = bestEnemyWithin(ctx, from, swarmRange, false);
  if (!found) return null;
  return toDecision(ctx, from, ActionType.Special, targetId, SWARM_SPECIAL);
}

// Electric Storm: +1 reactor tick on every ship in range, caster and allies
// included — only used to finish downed enemies, and only when safe: the
// caster's own timer can afford a tick, no ally in it is already near
// destruction, and it doesn't catch more allies than it finishes enemies.
// Worth it for 2+ finishable enemies, or 1 the gun can't otherwise reach.
// Mirrors _stormFrom.
function stormFromV2(ctx: Ctx, special: number, from: Position): AIDecision | null {
  if (special !== STORM_SPECIAL || ctx.attrs.reactorCriticalTimer >= 2) return null;
  const stormRange = getSpecialConfigWeb2(2, STORM_SPECIAL)?.range ?? 0;
  const s = sweep(ctx, from, stormRange);
  if (s.finishableEnemies === 0 || s.alliesAtRisk !== 0 || s.allies > s.finishableEnemies) return null;
  let worthIt = s.finishableEnemies >= 2;
  if (!worthIt) {
    const { found: gunReaches } = bestEnemyWithin(ctx, from, ctx.attrs.range, true);
    worthIt = !gunReaches;
  }
  if (!worthIt) return null;
  return toDecision(ctx, from, ActionType.Special, 0, STORM_SPECIAL);
}

// Act from `dest`: shoot if a gun target is in range, else reach with a
// Drone Swarm, else just take the move. Mirrors _fightFrom.
function fightFromV2(ctx: Ctx, special: number, dest: Position): AIDecision {
  const storm = stormFromV2(ctx, special, dest);
  if (storm) return storm;
  const { targetId, found } = bestEnemyWithin(ctx, dest, ctx.attrs.range, true);
  if (found) return toDecision(ctx, dest, ActionType.Shoot, targetId);
  const swarm = swarmFromV2(ctx, special, dest);
  if (swarm) return swarm;
  return toDecision(ctx, dest, ActionType.Pass, 0);
}

// Shoot if anything is in range from here; otherwise (holding an objective
// it already stands on, if `holdTiles`) advance at full speed toward the
// nearest enemy (stopping adjacent, never on its tile) and shoot from
// wherever that lands. Mirrors _brawl.
function brawlV2(ctx: Ctx, special: number, holdTiles: boolean): AIDecision {
  const { pos: enemyPos, found } = nearestEnemyPosition(ctx, false);
  if (!found || !enemyPos) return idleOrSeekTile(ctx);

  const storm = stormFromV2(ctx, special, ctx.pos);
  if (storm) return storm;
  const { targetId, found: inRange } = bestEnemyWithin(ctx, ctx.pos, ctx.attrs.range, true);
  if (inRange) return toDecision(ctx, ctx.pos, ActionType.Shoot, targetId);

  if (holdTiles && isScoringTile(ctx.scoringPositions, ctx.pos) && shouldHoldScoringTile(ctx)) {
    return holdDecision(ctx);
  }

  const dest = advanceToward(ctx, enemyPos, ctx.attrs.movement);
  return fightFromV2(ctx, special, dest);
}

// Long-gun support: shoots from where it stands if it can, otherwise
// advances only as far as maximum range (never backing off — slow ships
// can't run). Mirrors _fireSupport.
function fireSupportV2(ctx: Ctx, special: number): AIDecision {
  const { pos: enemyPos, found } = nearestEnemyPosition(ctx, false);
  if (!found || !enemyPos) return idleOrSeekTile(ctx);

  const stand = standoffPosition(ctx, enemyPos, false);
  const storm = stormFromV2(ctx, special, stand);
  if (storm) return storm;
  const { targetId, found: inRange } = bestEnemyWithin(ctx, stand, ctx.attrs.range, true);
  if (inRange) return toDecision(ctx, stand, ActionType.Shoot, targetId);
  const swarm = swarmFromV2(ctx, special, stand);
  if (swarm) return swarm;
  if (isScoringTile(ctx.scoringPositions, ctx.pos) && shouldHoldScoringTile(ctx)) return holdDecision(ctx);
  return approachOrSeekTile(ctx, enemyPos, true);
}

// With no tile to claim: finish downed enemies with a Storm if safe, shoot
// if anything is in range, otherwise shadow the most injured friendly —
// moving just far enough to repair it — else the shared fallback. Mirrors
// _support.
function supportV2(ctx: Ctx, special: number, healRange: number): AIDecision {
  const storm = stormFromV2(ctx, special, ctx.pos);
  if (storm) return storm;
  const { targetId, found } = bestEnemyWithin(ctx, ctx.pos, ctx.attrs.range, true);
  if (found) return toDecision(ctx, ctx.pos, ActionType.Shoot, targetId);
  const { decision, healed } = healWithReach(ctx, healRange, ActionType.FactionAbility);
  if (healed && decision) return decision;
  return decideSupportFallback(ctx);
}

// Holds objectives like any Turtle; reaches with Drone Swarm when its gun
// can't, and finishes downed enemies with a Storm when safe. Mirrors
// _turtle.
function turtleV2(ctx: Ctx, special: number): AIDecision {
  const storm = stormFromV2(ctx, special, ctx.pos);
  if (storm) return storm;
  const { found: gunReaches } = bestEnemyWithin(ctx, ctx.pos, ctx.attrs.range, true);
  if (!gunReaches) {
    const swarm = swarmFromV2(ctx, special, ctx.pos);
    if (swarm) return swarm;
  }
  return decideTurtle(ctx);
}

// The archetype's own tree, used only when there is no scoring tile to
// claim (or hold) — otherwise every ship fights from its objective tile.
// Mirrors _tree.
function treeV2(ctx: Ctx, archetype: Archetype, special: number, healRange: number): AIDecision {
  if (archetype === Archetype.Support) return supportV2(ctx, special, healRange);
  if (archetype === Archetype.Turtle) return turtleV2(ctx, special);
  if (archetype === Archetype.Sniper) return fireSupportV2(ctx, special);
  // Aggressor never stops to hold an objective; Grunt does. Rammer is
  // faction-1 only (no Ram here), so it plays as a Grunt too.
  return brawlV2(ctx, special, archetype !== Archetype.Aggressor);
}

// Priorities 2 and 3 plus the fighting tree; a Pass result is the caller's
// cue to try the last-resort heal from wherever it ended up. Mirrors
// _claimOrFight.
function claimOrFightV2(ctx: Ctx, archetype: Archetype, special: number, healRange: number): AIDecision {
  const { stand, objective } = claimScoringTile(ctx);
  if (objective) {
    const { decision, healed } = healDisabledFrom(ctx, stand, healRange, ActionType.FactionAbility);
    if (healed && decision) return decision;
    return fightFromV2(ctx, special, stand);
  }
  const { decision, healed } = healDisabledWithReach(ctx, healRange, ActionType.FactionAbility);
  if (healed && decision) return decision;
  return treeV2(ctx, archetype, special, healRange);
}

function decideVariant2(ctx: Ctx, archetype: Archetype, special: number): AIDecision {
  const healRange = getFactionAbilityConfigWeb2(2).range;

  // Priority 1: repair an injured/disabled friendly on a scoring tile.
  const { decision: onTileHeal, healed: onTileHealed } = healOnScoringTile(ctx, healRange, ActionType.FactionAbility);
  if (onTileHealed && onTileHeal) return onTileHeal;

  const d = claimOrFightV2(ctx, archetype, special, healRange);
  if (d.actionType !== ActionType.Pass) return d;

  // Last resort: repair itself or any injured friendly within reach of
  // wherever it ended up.
  const { decision: lastResort, healed } = healAnyFrom(ctx, { row: d.row, col: d.col }, healRange, ActionType.FactionAbility);
  return healed && lastResort ? lastResort : d;
}

// ============================================================================

export interface DecideAIMoveParams {
  g: Web2GameDataView;
  blockedGrid: boolean[][];
  scoringPositions: ScoringPosition[];
  shipId: number;
  archetype: Archetype;
  isCreatorSide: boolean;
  variant: number;
  mainWeapon: number;
  special: number;
}

/** Decides one AI ship's move. Callers must wrap execution in a try/catch-and-Pass fallback (see aiTurnWeb2.ts). */
export function decideAIMove(params: DecideAIMoveParams): AIDecision | null {
  const { g, blockedGrid, scoringPositions, shipId, archetype, isCreatorSide, variant, mainWeapon, special } = params;
  const shipPos = findPosition(g, shipId);
  const attrs = findAttributes(g, shipId);
  if (!shipPos || !attrs) return null;

  const ctx: Ctx = {
    g,
    blockedGrid,
    shipId,
    isCreatorSide,
    pos: shipPos.position,
    attrs,
    mainWeapon,
    scoringPositions,
    gridWidth: g.gridDimensions.gridWidth,
    gridHeight: g.gridDimensions.gridHeight,
  };

  return variant === 2 ? decideVariant2(ctx, archetype, special) : decideVariant1(ctx, archetype, special);
}
