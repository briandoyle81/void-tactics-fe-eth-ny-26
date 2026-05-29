/**
 * AI board evaluation function for Void Tactics.
 *
 * Returns a score from the AI's perspective: positive = good for AI, negative = bad.
 *
 * Game mechanics this function models:
 * - Points are scored by occupying capture squares at end of each round.
 *   First player to maxScore wins.
 * - Ships become disabled at 0 HP. Disabled ships can flee (costs their turn).
 * - Reactor critical timer increments when:
 *     (a) a disabled (0-HP) ship is hit by any weapon
 *     (b) a round ends while a ship has 0 HP
 *     (c) a ship is hit by EMP (regardless of current HP)
 * - Ships die when reactorCriticalTimer >= 3.
 * - Range uses Manhattan distance.
 */

import { Attributes, GameDataView, ScoringPosition } from "../types/types";

// ── Weights ────────────────────────────────────────────────────────────────

const W_SCORE_DELTA = 600;        // per point of score lead (scales up near maxScore)
const W_CAPTURE_HELD = 400;       // per capture square we occupy (scores next round-end)
const W_CAPTURE_CONTESTED = -200; // per capture square enemy occupies
const W_FLEET_SIZE = 250;         // per ship advantage
const W_HP_PERCENT = 1.5;         // per 1% of total fleet HP advantage
const W_DISABLED_SELF = -350;     // own ship at 0 HP — vulnerable each round-end
const W_DISABLED_ENEMY = 300;     // enemy at 0 HP — one step closer to death, costs them a turn to flee
const W_CRITICAL_1_SELF = -450;   // own ship reactor critical 1 — two ticks from death
const W_CRITICAL_2_SELF = -800;   // own ship reactor critical 2 — one tick from death
const W_CRITICAL_1_ENEMY = 300;   // enemy reactor critical 1 — we're winning attrition
const W_CRITICAL_2_ENEMY = 550;   // enemy reactor critical 2 — nearly dead
const W_IN_RANGE = 60;            // per enemy within weapon range of an active AI ship
const W_EXPOSED = -60;            // per AI ship within weapon range of an active enemy

const REACTOR_DEATH_THRESHOLD = 3;

// Manhattan distance — confirmed range metric for this game.
function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Build a map from shipId → Attributes from the parallel arrays in GameDataView.
function buildAttrMap(state: GameDataView): Map<number, Attributes> {
  const map = new Map<number, Attributes>();
  state.shipIds.forEach((id, i) => {
    const attr = state.shipAttributes[i];
    if (attr) map.set(id, attr);
  });
  return map;
}

// Build a map from shipId → position for ships currently on the grid (status 0).
function buildPosMap(state: GameDataView): Map<number, { row: number; col: number }> {
  const map = new Map<number, { row: number; col: number }>();
  for (const sp of state.shipPositions) {
    if (sp.status === 0 || sp.status == null) {
      map.set(sp.shipId, sp.position);
    }
  }
  return map;
}

// ── Main evaluation ────────────────────────────────────────────────────────

export function evaluateGameState(
  state: GameDataView,
  aiIsCreator: boolean,
  scoringPositions: ScoringPosition[] = [],
): number {
  const attrMap = buildAttrMap(state);
  const posMap = buildPosMap(state);

  const aiActiveIds: readonly number[] = aiIsCreator
    ? state.creatorActiveShipIds
    : state.joinerActiveShipIds;
  const enemyActiveIds: readonly number[] = aiIsCreator
    ? state.joinerActiveShipIds
    : state.creatorActiveShipIds;

  const aiScore = aiIsCreator ? state.creatorScore : state.joinerScore;
  const enemyScore = aiIsCreator ? state.joinerScore : state.creatorScore;

  // ── 1. Score delta ────────────────────────────────────────────────────────
  // Urgency increases as either player approaches maxScore — don't let the
  // opponent close out, and push hard when we're close to winning.
  const scoreProgress =
    state.maxScore > 0
      ? Math.max(aiScore, enemyScore) / state.maxScore
      : 0;
  const scoreDeltaScore =
    (aiScore - enemyScore) * W_SCORE_DELTA * (1 + scoreProgress);

  // ── 2. Capture square control ─────────────────────────────────────────────
  // Occupying a capture square at round-end generates points — this is the
  // primary win mechanism, so it gets heavy weight.
  let captureScore = 0;
  if (scoringPositions.length > 0) {
    for (const sp of scoringPositions) {
      const key = `${sp.row},${sp.col}`;
      let aiOnTile = false;
      let enemyOnTile = false;

      for (const id of aiActiveIds) {
        const pos = posMap.get(id);
        if (pos && `${pos.row},${pos.col}` === key) { aiOnTile = true; break; }
      }
      for (const id of enemyActiveIds) {
        const pos = posMap.get(id);
        if (pos && `${pos.row},${pos.col}` === key) { enemyOnTile = true; break; }
      }

      // Weight by tile point value so high-value tiles matter more.
      const tileValue = sp.points ?? 1;
      if (aiOnTile) captureScore += W_CAPTURE_HELD * tileValue;
      if (enemyOnTile) captureScore += W_CAPTURE_CONTESTED * tileValue;
    }
  }

  // ── 3. Fleet size advantage ──────────────────────────────────────────────
  const fleetScore = (aiActiveIds.length - enemyActiveIds.length) * W_FLEET_SIZE;

  // ── 4. HP advantage (% of max HP remaining) ───────────────────────────────
  let aiTotalHpPct = 0;
  let enemyTotalHpPct = 0;
  for (const id of aiActiveIds) {
    const attr = attrMap.get(id);
    if (attr && attr.maxHullPoints > 0) {
      aiTotalHpPct += (attr.hullPoints / attr.maxHullPoints) * 100;
    }
  }
  for (const id of enemyActiveIds) {
    const attr = attrMap.get(id);
    if (attr && attr.maxHullPoints > 0) {
      enemyTotalHpPct += (attr.hullPoints / attr.maxHullPoints) * 100;
    }
  }
  const hpScore = (aiTotalHpPct - enemyTotalHpPct) * W_HP_PERCENT;

  // ── 5. Reactor critical state ─────────────────────────────────────────────
  // 0 HP = disabled; reactor critical increments each round-end and on hits.
  // At >= 3 the ship dies. Graded penalties/bonuses by how close to death.
  let reactorScore = 0;
  for (const id of aiActiveIds) {
    const attr = attrMap.get(id);
    if (!attr) continue;
    if (attr.hullPoints === 0) {
      // Disabled — will take reactor damage at round-end regardless
      reactorScore += W_DISABLED_SELF;
      if (attr.reactorCriticalTimer === 1) reactorScore += W_CRITICAL_1_SELF;
      if (attr.reactorCriticalTimer === 2) reactorScore += W_CRITICAL_2_SELF;
      // Timer >= REACTOR_DEATH_THRESHOLD means already dead — not in activeIds
    }
  }
  for (const id of enemyActiveIds) {
    const attr = attrMap.get(id);
    if (!attr) continue;
    if (attr.hullPoints === 0) {
      reactorScore += W_DISABLED_ENEMY;
      if (attr.reactorCriticalTimer === 1) reactorScore += W_CRITICAL_1_ENEMY;
      if (attr.reactorCriticalTimer === 2) reactorScore += W_CRITICAL_2_ENEMY;
    }
  }

  // ── 6. Positioning (weapon range coverage) ────────────────────────────────
  // Count how many enemies each active, non-disabled AI ship can reach, and
  // how many AI ships are within each active enemy's range.
  // Disabled ships (0 HP) cannot shoot, so exclude them from the shooter side.
  let positioningScore = 0;

  for (const aiId of aiActiveIds) {
    const aiAttr = attrMap.get(aiId);
    const aiPos = posMap.get(aiId);
    if (!aiAttr || !aiPos || aiAttr.hullPoints === 0) continue;

    for (const enemyId of enemyActiveIds) {
      const enemyPos = posMap.get(enemyId);
      if (!enemyPos) continue;
      if (manhattan(aiPos.row, aiPos.col, enemyPos.row, enemyPos.col) <= aiAttr.range) {
        positioningScore += W_IN_RANGE;
      }
    }
  }

  for (const enemyId of enemyActiveIds) {
    const enemyAttr = attrMap.get(enemyId);
    const enemyPos = posMap.get(enemyId);
    if (!enemyAttr || !enemyPos || enemyAttr.hullPoints === 0) continue;

    for (const aiId of aiActiveIds) {
      const aiPos = posMap.get(aiId);
      if (!aiPos) continue;
      if (manhattan(enemyPos.row, enemyPos.col, aiPos.row, aiPos.col) <= enemyAttr.range) {
        positioningScore += W_EXPOSED;
      }
    }
  }

  return (
    scoreDeltaScore +
    captureScore +
    fleetScore +
    hpScore +
    reactorScore +
    positioningScore
  );
}

// ── Utility ────────────────────────────────────────────────────────────────

/** True if a ship's reactor state means it will die at round-end or on next hit. */
export function isDoomed(attr: Attributes): boolean {
  return attr.hullPoints === 0 && attr.reactorCriticalTimer >= REACTOR_DEATH_THRESHOLD - 1;
}

/** True if a ship is dead (should not be in activeIds, but useful for state simulation). */
export function isDead(attr: Attributes): boolean {
  return attr.reactorCriticalTimer >= REACTOR_DEATH_THRESHOLD;
}
