import type { GameDataView } from "@/app/types/types";
import type { GameRecord, TurnRecord } from "@/app/types/types";

export function buildInitialRecord(
  gameId: string,
  player1: string,
  player2: string,
  initialState: GameDataView
): GameRecord {
  return {
    gameId,
    initialState,
    player1,
    player2,
    winner: "",
    turns: [],
  };
}

export function appendTurn(
  record: GameRecord,
  snapshot: GameDataView,
  player: string,
  actions: unknown
): GameRecord {
  const turn: TurnRecord = {
    turnNumber: record.turns.length,
    round: Number(snapshot.turnState.currentRound),
    player,
    actions,
    snapshot,
    timestamp: Date.now(),
  };
  return { ...record, turns: [...record.turns, turn] };
}

export function finalizeRecord(record: GameRecord, winner: string): GameRecord {
  return { ...record, winner };
}
