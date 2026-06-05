/**
 * Greedy per-ship heuristic (Recruit difficulty) and candidate-pruning
 * layer for the minimax search.
 *
 * applyActionToState    — pure state simulation (mirrors server action/route.ts)
 * generateLegalActions  — all valid actions for one ship
 * topCandidatesForShip  — top-K ranked actions per ship (feeds minimax pruning)
 * greedyPickAction      — single best action for the current AI turn
 *
 * `specials` maps shipId → equipped special type (0=none, 1=EMP, 2=Repair, 3=Flak).
 * Pass this from the AI fleet roster so action generation knows which ships have specials.
 */

import {
  GameDataView,
  Attributes,
  ActionType,
  ScoringPosition,
} from "../types/types";
import { evaluateGameState } from "./aiEvaluate";
import { hasLineOfSight } from "./gameGridRanges";

// ── Public types ───────────────────────────────────────────────────────────────

export interface AiAction {
  shipId: bigint;
  row: number;          // ship's final row after movement
  col: number;          // ship's final col after movement
  actionType: ActionType;
  targetShipId: bigint; // 0n when no target
  specialType: number;  // 0 when not a special action
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SPECIAL_RANGES: Record<number, number> = {
  1: 3, // EMP
  2: 2, // Repair
  3: 3, // Flak
};
const SPECIAL_HEAL = 30; // Repair heals 30 HP (mirrors SPECIAL_CONFIG on server)
const REACTOR_DEATH = 3;

// ── Internal state-mutation helpers ───────────────────────────────────────────

function cloneState(s: GameDataView): GameDataView {
  return {
    ...s,
    shipAttributes: s.shipAttributes.map((a) => ({ ...a })),
    shipPositions: s.shipPositions.map((p) => ({ ...p })),
    creatorActiveShipIds: [...s.creatorActiveShipIds],
    joinerActiveShipIds: [...s.joinerActiveShipIds],
    creatorMovedShipIds: [...s.creatorMovedShipIds],
    joinerMovedShipIds: [...s.joinerMovedShipIds],
  };
}

function shipAttrIdx(s: GameDataView, shipId: bigint): number {
  return (s.shipIds as readonly bigint[]).indexOf(shipId);
}

function getAttr(s: GameDataView, shipId: bigint): Attributes | undefined {
  const i = shipAttrIdx(s, shipId);
  return i === -1 ? undefined : s.shipAttributes[i];
}

function getPos(s: GameDataView, shipId: bigint): { row: number; col: number } | undefined {
  return s.shipPositions.find((p) => p.shipId === shipId)?.position;
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function removeFromActive(s: GameDataView, shipId: bigint): GameDataView {
  return {
    ...s,
    creatorActiveShipIds: s.creatorActiveShipIds.filter((id) => id !== shipId),
    joinerActiveShipIds: s.joinerActiveShipIds.filter((id) => id !== shipId),
  };
}

function moveShipInState(s: GameDataView, shipId: bigint, r: number, c: number): GameDataView {
  const idx = s.shipPositions.findIndex((p) => p.shipId === shipId);
  if (idx === -1) return s;
  const newPositions = s.shipPositions.map((p, i) =>
    i === idx ? { ...p, position: { row: r, col: c } } : p,
  );
  return { ...s, shipPositions: newPositions };
}

function applyShootInState(s: GameDataView, attackerId: bigint, targetId: bigint): GameDataView {
  const aIdx = shipAttrIdx(s, attackerId);
  const tIdx = shipAttrIdx(s, targetId);
  if (aIdx === -1 || tIdx === -1) return s;

  const newAttrs = s.shipAttributes.map((a) => ({ ...a }));
  const attacker = newAttrs[aIdx]!;
  const target = newAttrs[tIdx]!;

  const wasDisabled = target.hullPoints === 0;
  if (wasDisabled) {
    // Hitting a disabled ship pushes its reactor closer to death
    target.reactorCriticalTimer = (target.reactorCriticalTimer ?? 0) + 1;
  } else {
    const dmg = Math.max(
      1,
      attacker.gunDamage - Math.floor((attacker.gunDamage * target.damageReduction) / 100),
    );
    target.hullPoints = Math.max(0, target.hullPoints - dmg);
  }

  let ns: GameDataView = { ...s, shipAttributes: newAttrs };
  if ((newAttrs[tIdx]!.reactorCriticalTimer ?? 0) >= REACTOR_DEATH) {
    ns = {
      ...removeFromActive(ns, targetId),
      shipPositions: ns.shipPositions.filter((p) => p.shipId !== targetId),
    };
  }
  return ns;
}

// ── applyActionToState ─────────────────────────────────────────────────────────

/**
 * Pure function: applies one ship action and returns the updated state.
 * Mirrors the logic in app/api/games/[id]/action/route.ts.
 * Does NOT simulate round-end scoring or reactor ticks — those are handled by
 * the evaluation function's weights.
 */
export function applyActionToState(state: GameDataView, action: AiAction): GameDataView {
  const { shipId, row, col, actionType, targetShipId, specialType } = action;
  let s = cloneState(state);

  switch (actionType) {
    case ActionType.Pass:
    case ActionType.ClaimPoints:
      s = moveShipInState(s, shipId, row, col);
      break;

    case ActionType.Shoot:
      s = moveShipInState(s, shipId, row, col);
      s = applyShootInState(s, shipId, targetShipId);
      break;

    case ActionType.Special: {
      s = moveShipInState(s, shipId, row, col);

      if (specialType === 1) {
        // EMP: increment reactor timer on the target enemy
        const tIdx = shipAttrIdx(s, targetShipId);
        if (tIdx !== -1) {
          const newAttrs = s.shipAttributes.map((a) => ({ ...a }));
          const t = newAttrs[tIdx]!;
          t.reactorCriticalTimer = (t.reactorCriticalTimer ?? 0) + 1;
          t.statusEffects = [...(t.statusEffects ?? []), 1];
          s = { ...s, shipAttributes: newAttrs };
          if (t.reactorCriticalTimer >= REACTOR_DEATH) {
            s = {
              ...removeFromActive(s, targetShipId),
              shipPositions: s.shipPositions.filter((p) => p.shipId !== targetShipId),
            };
          }
        }
      } else if (specialType === 2) {
        // Repair: heal a friendly ship and clear its reactor timer
        const tIdx = shipAttrIdx(s, targetShipId);
        if (tIdx !== -1) {
          const newAttrs = s.shipAttributes.map((a) => ({ ...a }));
          const t = newAttrs[tIdx]!;
          t.hullPoints = Math.min(t.maxHullPoints, t.hullPoints + SPECIAL_HEAL);
          t.reactorCriticalTimer = 0;
          s = { ...s, shipAttributes: newAttrs };
        }
      } else if (specialType === 3) {
        // Flak: gun damage to all active ships within range (friendly fire included)
        const flakRange = SPECIAL_RANGES[3]!;
        const allActive = [...s.creatorActiveShipIds, ...s.joinerActiveShipIds];
        for (const tid of allActive) {
          if (tid === shipId) continue;
          const tPos = getPos(s, tid);
          if (!tPos) continue;
          if (manhattan(tPos.row, tPos.col, row, col) <= flakRange) {
            s = applyShootInState(s, shipId, tid);
          }
        }
      }
      break;
    }

    case ActionType.Ram: {
      // Rammer moves onto the disabled target's tile; target is removed without reactor damage
      s = moveShipInState(s, shipId, row, col);
      s = {
        ...s,
        shipPositions: s.shipPositions.filter((p) => p.shipId !== targetShipId),
        creatorActiveShipIds: s.creatorActiveShipIds.filter((id) => id !== targetShipId),
        joinerActiveShipIds: s.joinerActiveShipIds.filter((id) => id !== targetShipId),
      };
      // Ramming costs the rammer +1 reactor
      const rIdx = shipAttrIdx(s, shipId);
      if (rIdx !== -1) {
        const newAttrs = s.shipAttributes.map((a) => ({ ...a }));
        const r = newAttrs[rIdx]!;
        r.reactorCriticalTimer = (r.reactorCriticalTimer ?? 0) + 1;
        s = { ...s, shipAttributes: newAttrs };
        if (r.reactorCriticalTimer >= REACTOR_DEATH) {
          s = {
            ...removeFromActive(s, shipId),
            shipPositions: s.shipPositions.filter((p) => p.shipId !== shipId),
          };
        }
      }
      break;
    }

    case ActionType.Retreat:
      s = {
        ...s,
        shipPositions: s.shipPositions.filter((p) => p.shipId !== shipId),
        creatorActiveShipIds: s.creatorActiveShipIds.filter((id) => id !== shipId),
        joinerActiveShipIds: s.joinerActiveShipIds.filter((id) => id !== shipId),
      };
      break;
  }

  // Mark ship as moved (mirrors server logic)
  const belongsToCreator =
    s.shipPositions.find((p) => p.shipId === shipId)?.isCreator ??
    state.shipPositions.find((p) => p.shipId === shipId)?.isCreator ??
    false;
  if (belongsToCreator) {
    if (!s.creatorMovedShipIds.some((id) => id === shipId)) {
      s = { ...s, creatorMovedShipIds: [...s.creatorMovedShipIds, shipId] };
    }
  } else {
    if (!s.joinerMovedShipIds.some((id) => id === shipId)) {
      s = { ...s, joinerMovedShipIds: [...s.joinerMovedShipIds, shipId] };
    }
  }

  return s;
}

// ── generateLegalActions ───────────────────────────────────────────────────────

/**
 * Returns every legal action available to `shipId` in the current state.
 * `specials` maps shipId → equipped special type (from fleet ship data).
 */
export function generateLegalActions(
  state: GameDataView,
  shipId: bigint,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  specials: Map<bigint, number>,
): AiAction[] {
  const attr = getAttr(state, shipId);
  const pos = getPos(state, shipId);
  if (!attr || !pos) return [];

  const { gridWidth, gridHeight } = state.gridDimensions;
  const enemyActiveIds = aiIsCreator
    ? state.joinerActiveShipIds
    : state.creatorActiveShipIds;
  const allyActiveIds = aiIsCreator
    ? state.creatorActiveShipIds
    : state.joinerActiveShipIds;

  // Disabled ship: only retreat (it will take reactor damage at round end otherwise)
  if (attr.hullPoints === 0) {
    return [{
      shipId, row: pos.row, col: pos.col,
      actionType: ActionType.Retreat, targetShipId: 0n, specialType: 0,
    }];
  }

  const movRange = attr.movement || 1;
  const weapRange = attr.range || 1;
  const equippedSpecial = specials.get(shipId) ?? 0;
  const specialRange = equippedSpecial > 0 ? (SPECIAL_RANGES[equippedSpecial] ?? 0) : 0;

  // Build a set of occupied tiles (any alive ship)
  const occupiedKeys = new Set(
    state.shipPositions
      .filter((p) => (p.status ?? 0) === 0)
      .map((p) => `${p.position.row},${p.position.col}`),
  );

  // Collect disabled enemies that can be rammed (their tiles ARE occupied)
  const disabledEnemies = enemyActiveIds
    .map((id) => {
      const a = getAttr(state, id);
      const p = getPos(state, id);
      return a && p && a.hullPoints === 0 ? { id, row: p.row, col: p.col } : null;
    })
    .filter((x): x is { id: bigint; row: number; col: number } => x !== null);

  // All positions the ship can end up at after moving (including staying in place)
  const moveTargets: Array<{ row: number; col: number }> = [pos];
  for (
    let r = Math.max(0, pos.row - movRange);
    r <= Math.min(gridHeight - 1, pos.row + movRange);
    r++
  ) {
    for (
      let c = Math.max(0, pos.col - movRange);
      c <= Math.min(gridWidth - 1, pos.col + movRange);
      c++
    ) {
      if (r === pos.row && c === pos.col) continue;
      if (manhattan(r, c, pos.row, pos.col) > movRange) continue;
      if (occupiedKeys.has(`${r},${c}`)) continue; // blocked by any ship
      moveTargets.push({ row: r, col: c });
    }
  }

  const actions: AiAction[] = [];

  for (const mp of moveTargets) {
    // Always can just move (or stay in place)
    actions.push({
      shipId, row: mp.row, col: mp.col,
      actionType: ActionType.Pass, targetShipId: 0n, specialType: 0,
    });

    // Shoot each enemy reachable from this position
    for (const eid of enemyActiveIds) {
      const epos = getPos(state, eid);
      if (!epos) continue;
      const dist = manhattan(mp.row, mp.col, epos.row, epos.col);
      if (dist > weapRange) continue;
      // Adjacent shots always valid; farther shots need line of sight
      if (dist > 1 && !hasLineOfSight(mp.row, mp.col, epos.row, epos.col, blockedGrid)) continue;
      actions.push({
        shipId, row: mp.row, col: mp.col,
        actionType: ActionType.Shoot, targetShipId: eid, specialType: 0,
      });
    }

    // Special abilities
    if (equippedSpecial === 1) {
      // EMP: target any enemy within range, ignores LOS
      for (const eid of enemyActiveIds) {
        const epos = getPos(state, eid);
        if (!epos) continue;
        if (manhattan(mp.row, mp.col, epos.row, epos.col) <= specialRange) {
          actions.push({
            shipId, row: mp.row, col: mp.col,
            actionType: ActionType.Special, targetShipId: eid, specialType: 1,
          });
        }
      }
    } else if (equippedSpecial === 2) {
      // Repair: heal any allied ship within range (including self-position edge case), ignores LOS
      for (const aid of allyActiveIds) {
        if (aid === shipId) continue; // can't repair the mover's current moving position
        const apos = getPos(state, aid);
        if (!apos) continue;
        if (manhattan(mp.row, mp.col, apos.row, apos.col) <= specialRange) {
          actions.push({
            shipId, row: mp.row, col: mp.col,
            actionType: ActionType.Special, targetShipId: aid, specialType: 2,
          });
        }
      }
    } else if (equippedSpecial === 3) {
      // Flak: area effect centered on landing tile — one action per position
      actions.push({
        shipId, row: mp.row, col: mp.col,
        actionType: ActionType.Special, targetShipId: 0n, specialType: 3,
      });
    }
  }

  // Ram: move onto a disabled enemy's tile (within movement range)
  for (const dep of disabledEnemies) {
    if (manhattan(pos.row, pos.col, dep.row, dep.col) <= movRange) {
      actions.push({
        shipId, row: dep.row, col: dep.col,
        actionType: ActionType.Ram, targetShipId: dep.id, specialType: 0,
      });
    }
  }

  return actions;
}

// ── Scoring & candidate selection ─────────────────────────────────────────────

function scoreAction(
  state: GameDataView,
  action: AiAction,
  aiIsCreator: boolean,
  scoringPositions: ScoringPosition[],
): number {
  const next = applyActionToState(state, action);
  return evaluateGameState(next, aiIsCreator, scoringPositions);
}

/**
 * Returns the top `k` actions for `shipId`, ranked by eval delta.
 * Used by minimax to prune the per-ship action space before building the tree.
 */
export function topCandidatesForShip(
  state: GameDataView,
  shipId: bigint,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<bigint, number>,
  k: number,
): AiAction[] {
  const candidates = generateLegalActions(state, shipId, aiIsCreator, blockedGrid, specials);
  if (candidates.length <= k) return candidates;

  const scored = candidates.map((a) => ({
    action: a,
    score: scoreAction(state, a, aiIsCreator, scoringPositions),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => x.action);
}

// ── greedyPickAction ───────────────────────────────────────────────────────────

/**
 * Returns the single best action for the AI to submit on its current turn.
 *
 * Considers all unmoved healthy AI ships. For each, generates legal actions and
 * scores them by evaluating the resulting state. Returns the globally best
 * (ship, action) pair.
 *
 * `errorRate` (default 0.2) is the probability of picking a random action instead
 * of the best — this is the Recruit-level error injection.
 */
export function greedyPickAction(
  state: GameDataView,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<bigint, number>,
  errorRate = 0.2,
): AiAction | null {
  const myActiveIds = aiIsCreator ? state.creatorActiveShipIds : state.joinerActiveShipIds;
  const myMovedIds = aiIsCreator ? state.creatorMovedShipIds : state.joinerMovedShipIds;

  // Only consider healthy unmoved ships — disabled ships don't need to submit moves
  const unmovedHealthy = myActiveIds.filter((id) => {
    const attr = getAttr(state, id);
    return attr && attr.hullPoints > 0 && !myMovedIds.some((mid) => mid === id);
  });

  if (unmovedHealthy.length === 0) return null;

  // Build a flat list of all (ship, action) candidates with scores
  const allCandidates: Array<{ action: AiAction; score: number }> = [];
  for (const shipId of unmovedHealthy) {
    const actions = generateLegalActions(state, shipId, aiIsCreator, blockedGrid, specials);
    for (const action of actions) {
      allCandidates.push({
        action,
        score: scoreAction(state, action, aiIsCreator, scoringPositions),
      });
    }
  }

  if (allCandidates.length === 0) return null;

  // Recruit error injection: occasionally pick randomly instead of optimally
  if (Math.random() < errorRate) {
    return allCandidates[Math.floor(Math.random() * allCandidates.length)]!.action;
  }

  allCandidates.sort((a, b) => b.score - a.score);
  return allCandidates[0]!.action;
}
