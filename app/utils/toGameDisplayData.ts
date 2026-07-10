import type { GameDataView } from "../types/types";
import type { GameScoreData, GameWinnerResult } from "../types/gameDisplayData";

// Boundary adapters from web3's bigint/address game data to the
// number/string-native display shapes in app/types/gameDisplayData.ts. See
// app/types/gridDisplay.ts for why this conversion belongs here rather than
// in the shared display components. Web2 code never needs these — its data
// is already display-native (see app/utils/gameDisplayDataWeb2.ts).

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function toGameScoreData(
  game: Pick<GameDataView, "metadata" | "creatorScore" | "joinerScore" | "maxScore">,
  playerAddress: string | undefined,
): GameScoreData {
  const isCreator = game.metadata.creator === playerAddress;
  return {
    myScore: Number(isCreator ? game.creatorScore : game.joinerScore),
    opponentScore: Number(isCreator ? game.joinerScore : game.creatorScore),
    maxScore: Number(game.maxScore),
  };
}

export function toGameWinnerResult(
  winner: string,
  playerAddress: string | undefined,
): GameWinnerResult {
  if (winner === ZERO_ADDR) return null;
  return winner === playerAddress ? "me" : "opponent";
}
