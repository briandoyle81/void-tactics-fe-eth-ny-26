import type { Web2GameDataView } from "../types/web2Game";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import type { GameScoreData, GameWinnerResult } from "../types/gameDisplayData";

// Web2 counterpart to app/utils/toGameDisplayData.ts — no bigint to convert
// (Web2GameDataView is already number/string-native), just picking fields
// into the same display shapes GameDisplay.tsx's converters produce, so
// GameScoreBox/GameTurnTimer/etc. never need to know which mode fed them.

export function toGameScoreDataWeb2(
  game: Pick<Web2GameDataView, "metadata" | "creatorScore" | "joinerScore" | "maxScore">,
  playerId: string | null,
): GameScoreData {
  const isCreator = game.metadata.creator === playerId;
  return {
    myScore: isCreator ? game.creatorScore : game.joinerScore,
    opponentScore: isCreator ? game.joinerScore : game.creatorScore,
    maxScore: game.maxScore,
  };
}

export function toGameWinnerResultWeb2(
  winner: string,
  playerId: string | null,
): GameWinnerResult {
  if (winner === "") return null;
  if (winner === WEB2_TIE_SENTINEL) return "tie";
  return winner === playerId ? "me" : "opponent";
}
