// How many AI moves to send in one takeAITurns call. Turns alternate ship
// by ship (Game._switchTurnIfOtherPlayerHasShips), so the AI only keeps the
// turn for several moves in a row once the human has no unmoved ships left
// this round — the "tail" case. There, one takeAITurns(gameId, n) replaces
// n separate takeAITurn transactions. Anywhere else, one move per call.
// See docs/redesign-10-7/frontend-handoff-rpc-cost-suggestions-2026-10-08.md §1.

/** Upper bound per batch: each AI move is an expensive on-chain decision. */
export const MAX_AI_MOVES_PER_BATCH = 6;

export function aiTurnBatchSize({
  humanActiveShipIds,
  aiActiveShipIds,
  movedShipIds,
  max = MAX_AI_MOVES_PER_BATCH,
}: {
  humanActiveShipIds: readonly bigint[];
  aiActiveShipIds: readonly bigint[];
  movedShipIds: ReadonlySet<bigint>;
  max?: number;
}): number {
  const humanUnmoved = humanActiveShipIds.filter((id) => !movedShipIds.has(id)).length;
  if (humanUnmoved > 0) return 1;
  const aiUnmoved = aiActiveShipIds.filter((id) => !movedShipIds.has(id)).length;
  return Math.max(1, Math.min(aiUnmoved, max));
}
