/**
 * Unified AI action dispatcher.
 *
 * Single entry point for the AI endpoint: maps difficulty → algorithm.
 *
 *   Recruit   → greedy heuristic, ~20 % random error
 *   Veteran   → minimax depth 2  (1 full round look-ahead)
 *   Commander → minimax depth 4  (2 full rounds)
 *   Elite     → iterative deepening within a 500 ms budget
 *
 * All algorithms share the same evaluation function, action generator, and
 * per-ship candidate pruning from aiGreedy / aiMinimax / aiIterativeDeepening.
 */

import { GameDataView, ScoringPosition } from "../types/types";
import { AiAction, greedyPickAction } from "./aiGreedy";
import { minimaxPickAction } from "./aiMinimax";
import { elitePickAction } from "./aiIterativeDeepening";

export type AiDifficulty = "recruit" | "veteran" | "commander" | "elite";

/**
 * Returns the single best action for the AI to submit on its current turn,
 * using the algorithm appropriate for `difficulty`.
 *
 * `specials` maps shipId → equipped special type (0 none, 1 EMP, 2 Repair, 3 Flak).
 * Build this from the AI's fleet data before calling.
 */
export function pickAiAction(
  difficulty: AiDifficulty,
  state: GameDataView,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
  specials: Map<number, number>,
): AiAction | null {
  switch (difficulty) {
    case "recruit":
      return greedyPickAction(
        state, aiIsCreator, blockedGrid, scoringPositions, specials,
        0.2, // 20 % random error
      );

    case "veteran":
      return minimaxPickAction(
        state, 2, aiIsCreator, blockedGrid, scoringPositions, specials,
      );

    case "commander":
      return minimaxPickAction(
        state, 4, aiIsCreator, blockedGrid, scoringPositions, specials,
      );

    case "elite":
      return elitePickAction(
        state, aiIsCreator, blockedGrid, scoringPositions, specials,
      );
  }
}
