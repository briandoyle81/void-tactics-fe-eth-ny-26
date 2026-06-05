/**
 * Minimax with alpha-beta pruning — Veteran and Commander difficulty.
 *
 * Ply model: one "ply" = one complete player half-round (all ships act).
 *   depth 2 = AI half-round + enemy half-round = 1 full game round (Veteran)
 *   depth 4 = 2 full rounds (Commander)
 *
 * Branching factor: top K candidates per ship (K=3) → K^N per half-round.
 * Move ordering: sort by eval before iterating → alpha-beta cuts ~sqrt of nodes.
 *
 * Round-end reactor ticks are applied after the enemy's half-round (i.e., at the
 * boundary between every two consecutive plies), mirroring server logic.
 *
 * minimaxPickAction — returns ONE action (the first ship to act from the best
 *   planned AI half-round). The game takes actions one ship at a time; the caller
 *   submits this action, and on the AI's next turn the search re-plans from the
 *   updated state.
 */

import { GameDataView, Attributes, ScoringPosition } from "../types/types";
import { evaluateGameState } from "./aiEvaluate";
import {
  AiAction,
  applyActionToState,
  topCandidatesForShip,
} from "./aiGreedy";

// ── Constants ──────────────────────────────────────────────────────────────────

const CANDIDATES_PER_SHIP = 3;

/**
 * Cap on total branch combinations generated per half-round ply.
 * Keeps memory and time predictable for large fleets: when N ships × K candidates
 * would exceed this, K is silently reduced so K^N ≤ MAX_COMBINATIONS.
 *
 * 243 = 3^5 — matches a 5-ship fleet at K=3, the design doc's reference case.
 */
const MAX_COMBINATIONS = 243;

/**
 * Returns the largest k' ≤ requestedK such that k'^numShips ≤ MAX_COMBINATIONS.
 * For 1–5 ships at K=3 the answer is just K (no reduction needed).
 * For larger fleets K drops to keep the tree tractable.
 */
function effectiveK(requestedK: number, numShips: number): number {
  if (numShips <= 1) return requestedK;
  for (let k = requestedK; k >= 2; k--) {
    if (Math.pow(k, numShips) <= MAX_COMBINATIONS) return k;
  }
  return 2; // minimum: at least 2 candidates so there's always a choice
}

// ── Timeout signalling ─────────────────────────────────────────────────────────

/** Thrown by minimaxSearch when the wall-clock deadline is exceeded. */
export class SearchTimeout extends Error {
  constructor() { super("search timeout"); }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function getAttrAt(s: GameDataView, shipId: bigint): Attributes | undefined {
  const i = (s.shipIds as readonly bigint[]).indexOf(shipId);
  return i === -1 ? undefined : s.shipAttributes[i];
}

/**
 * Returns healthy unmoved ships for one side.
 * isAi=true → AI's ships; isAi=false → enemy's ships.
 */
function getRemainingShips(
  state: GameDataView,
  isAi: boolean,
  aiIsCreator: boolean,
): bigint[] {
  const sideIsCreator = isAi ? aiIsCreator : !aiIsCreator;
  const activeIds = sideIsCreator
    ? state.creatorActiveShipIds
    : state.joinerActiveShipIds;
  const movedIds = sideIsCreator
    ? state.creatorMovedShipIds
    : state.joinerMovedShipIds;

  return (activeIds as readonly bigint[]).filter((id) => {
    const attr = getAttrAt(state, id);
    return attr && attr.hullPoints > 0 && !(movedIds as readonly bigint[]).includes(id);
  });
}

/**
 * Applies round-end reactor ticks (mirrors server action/route.ts logic).
 * Any active ship at 0 HP takes +1 reactor damage; ships reaching timer ≥ 3 are destroyed.
 * Also resets moved-ship lists, since this marks the start of a new round.
 */
export function applyRoundEndTicks(state: GameDataView): GameDataView {
  const attrs = state.shipAttributes.map((a) => ({ ...a }));
  let creatorActive = [...state.creatorActiveShipIds] as bigint[];
  let joinerActive = [...state.joinerActiveShipIds] as bigint[];
  const activeSet = new Set<bigint>([...creatorActive, ...joinerActive]);
  const destroyedIds = new Set<bigint>();

  (state.shipIds as readonly bigint[]).forEach((sid, idx) => {
    if (!activeSet.has(sid)) return;
    const attr = attrs[idx]!;
    if (attr.hullPoints === 0) {
      attr.reactorCriticalTimer = (attr.reactorCriticalTimer ?? 0) + 1;
      if (attr.reactorCriticalTimer >= 3) {
        destroyedIds.add(sid);
        creatorActive = creatorActive.filter((id) => id !== sid);
        joinerActive = joinerActive.filter((id) => id !== sid);
      }
    }
  });

  return {
    ...state,
    shipAttributes: attrs,
    shipPositions:
      destroyedIds.size > 0
        ? state.shipPositions.filter((p) => !destroyedIds.has(p.shipId))
        : state.shipPositions,
    creatorActiveShipIds: creatorActive,
    joinerActiveShipIds: joinerActive,
    creatorMovedShipIds: [], // new round starts
    joinerMovedShipIds: [],
  };
}

// ── enumerateTurns ─────────────────────────────────────────────────────────────

/**
 * Generates all K^N combinations of top-K actions for the given ships,
 * applied sequentially to build full-half-round states.
 *
 * Returned list is sorted for optimal alpha-beta move ordering:
 *   AI half-rounds → descending eval (best AI moves first, maximizer explores best first)
 *   Enemy half-rounds → ascending eval (worst-for-AI moves first, minimizer explores best first)
 */
function enumerateTurns(
  initialState: GameDataView,
  ships: bigint[],
  isAi: boolean,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<bigint, number>,
  k: number,
  deadline = Infinity,
): Array<{ firstAction: AiAction | null; finalState: GameDataView }> {
  if (ships.length === 0) {
    return [{ firstAction: null, finalState: initialState }];
  }

  const sideIsCreator = isAi ? aiIsCreator : !aiIsCreator;
  const kEff = effectiveK(k, ships.length); // adapt K to fleet size
  const results: Array<{ firstAction: AiAction; finalState: GameDataView }> = [];

  function recurse(
    index: number,
    firstAction: AiAction | null,
    currentState: GameDataView,
  ) {
    if (Date.now() >= deadline) throw new SearchTimeout();

    if (index === ships.length) {
      if (firstAction) results.push({ firstAction, finalState: currentState });
      return;
    }

    const shipId = ships[index]!;
    const candidates = topCandidatesForShip(
      currentState,
      shipId,
      sideIsCreator,
      blockedGrid,
      scoringPositions,
      specials,
      kEff,
    );

    for (const action of candidates) {
      const next = applyActionToState(currentState, action);
      recurse(index + 1, firstAction ?? action, next);
    }
  }

  recurse(0, null, initialState);

  // Sort for move ordering: AI's turns descending (best first), enemy's ascending (worst-for-AI first)
  results.sort((a, b) => {
    const scoreA = evaluateGameState(a.finalState, aiIsCreator, scoringPositions);
    const scoreB = evaluateGameState(b.finalState, aiIsCreator, scoringPositions);
    return isAi ? scoreB - scoreA : scoreA - scoreB;
  });

  return results;
}

// ── Minimax ────────────────────────────────────────────────────────────────────

/**
 * Recursive minimax with alpha-beta pruning.
 *
 * `depth` counts half-round plies remaining:
 *   - AI's half-round: maximizing, depth decrements before recursing to enemy's half-round
 *   - Enemy's half-round: minimizing, depth decrements; round-end ticks applied before recursing
 * `aiGoesNow`: true when it's the AI's half-round to plan.
 */
function minimaxSearch(
  state: GameDataView,
  depth: number,
  alpha: number,
  beta: number,
  aiGoesNow: boolean,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<bigint, number>,
  k: number,
  deadline: number,
): number {
  if (Date.now() >= deadline) throw new SearchTimeout();

  if (depth === 0) {
    return evaluateGameState(state, aiIsCreator, scoringPositions);
  }

  const remaining = getRemainingShips(state, aiGoesNow, aiIsCreator);

  if (remaining.length === 0) {
    if (aiGoesNow) {
      // AI has no ships left to move this half-round; pass immediately to enemy
      return minimaxSearch(
        state, depth, alpha, beta, false,
        aiIsCreator, blockedGrid, scoringPositions, specials, k, deadline,
      );
    } else {
      // Enemy is done; round ends — apply reactor ticks and start next round
      const nextState = applyRoundEndTicks(state);
      return minimaxSearch(
        nextState, depth - 1, alpha, beta, true,
        aiIsCreator, blockedGrid, scoringPositions, specials, k, deadline,
      );
    }
  }

  const turns = enumerateTurns(
    state, remaining, aiGoesNow, aiIsCreator,
    blockedGrid, scoringPositions, specials, k, deadline,
  );

  if (aiGoesNow) {
    // Maximising — try AI's half-rounds; enemy responds next
    let best = -Infinity;
    for (const { finalState } of turns) {
      const score = minimaxSearch(
        finalState, depth - 1, alpha, beta, false,
        aiIsCreator, blockedGrid, scoringPositions, specials, k, deadline,
      );
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break; // β-cutoff
    }
    return best;
  } else {
    // Minimising — try enemy's half-rounds; round ends after each, then AI goes
    let worst = Infinity;
    for (const { finalState } of turns) {
      const roundEndState = applyRoundEndTicks(finalState);
      const score = minimaxSearch(
        roundEndState, depth - 1, alpha, beta, true,
        aiIsCreator, blockedGrid, scoringPositions, specials, k, deadline,
      );
      if (score < worst) worst = score;
      if (score < beta) beta = score;
      if (beta <= alpha) break; // α-cutoff
    }
    return worst;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the single best action for the AI to submit now.
 *
 * Internally plans the AI's full remaining half-round via minimax, then
 * returns the first action from the best planned turn sequence.
 *
 * depth:
 *   2 → Veteran   (1 full round look-ahead: AI + enemy)
 *   4 → Commander (2 full rounds)
 *
 * k: candidates per ship (default 3). Branching factor = k^N per half-round.
 */
export function minimaxPickAction(
  state: GameDataView,
  depth: number,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<bigint, number>,
  k = CANDIDATES_PER_SHIP,
  deadline = Infinity,
): AiAction | null {
  const remaining = getRemainingShips(state, true, aiIsCreator);
  if (remaining.length === 0) return null;

  const turns = enumerateTurns(
    state, remaining, true, aiIsCreator,
    blockedGrid, scoringPositions, specials, k, deadline,
  );
  if (turns.length === 0) return null;

  let bestScore = -Infinity;
  let bestFirstAction: AiAction | null = null;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const { firstAction, finalState } of turns) {
    if (!firstAction) continue;

    // After AI's half-round, explore enemy's response at depth-1
    const score = minimaxSearch(
      finalState, depth - 1, alpha, beta, false,
      aiIsCreator, blockedGrid, scoringPositions, specials, k, deadline,
    );

    if (score > bestScore) {
      bestScore = score;
      bestFirstAction = firstAction;
    }
    if (score > alpha) alpha = score;
    // beta=Infinity at root so no cutoff here; pruning happens inside recursive calls
  }

  return bestFirstAction;
}
