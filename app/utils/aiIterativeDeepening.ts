/**
 * Time-budgeted iterative deepening for Elite difficulty.
 *
 * Runs minimax starting at depth 2 (Veteran level) and increases by 2 plies
 * (one full round) per iteration until the wall-clock budget is exhausted.
 * The result from the deepest FULLY COMPLETED search is returned.
 *
 * If time runs out before even the first minimax search completes, falls back
 * to the greedy result (depth 0, no random error).
 *
 * elitePickAction(state, aiIsCreator, blockedGrid, scoringPositions, specials, budgetMs?)
 *   budgetMs defaults to 500.
 */

import { GameDataView, ScoringPosition } from "../types/types";
import { AiAction, greedyPickAction } from "./aiGreedy";
import { minimaxPickAction, SearchTimeout } from "./aiMinimax";

const ELITE_BUDGET_MS = 500;
const MAX_DEPTH = 20;         // effectively unlimited; budget will cut it first
const CANDIDATES_PER_SHIP = 3;

export function elitePickAction(
  state: GameDataView,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<number, number>,
  budgetMs = ELITE_BUDGET_MS,
): AiAction | null {
  const deadline = Date.now() + budgetMs;

  // Greedy result (no random error) serves as baseline if no minimax depth completes
  let bestAction = greedyPickAction(
    state, aiIsCreator, blockedGrid, scoringPositions, specials,
    0, // errorRate=0 — Elite never plays randomly
  );

  for (let depth = 2; depth <= MAX_DEPTH; depth += 2) {
    if (Date.now() >= deadline) break;

    try {
      const action = minimaxPickAction(
        state, depth, aiIsCreator, blockedGrid, scoringPositions, specials,
        CANDIDATES_PER_SHIP, deadline,
      );
      // Only update if search completed without timeout
      if (action !== null) bestAction = action;
    } catch (e) {
      if (e instanceof SearchTimeout) {
        // This depth's search was cut short — discard partial result and stop
        break;
      }
      throw e;
    }
  }

  return bestAction;
}
