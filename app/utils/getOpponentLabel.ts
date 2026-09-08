import { Address } from "viem";
import { GameDataView } from "../types/types";
import { SINGLE_PLAYER_MATCH_ADDRESS } from "../hooks/useSinglePlayerMatch";

function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Human is always the creator in single-player (per SinglePlayerMatch flow), so only the joiner side needs the AI check. */
export function getOpponentLabel(
  game: GameDataView,
  viewerAddress?: Address,
): string {
  const isViewerCreator =
    !!viewerAddress &&
    game.metadata.creator.toLowerCase() === viewerAddress.toLowerCase();
  const opponentAddress = isViewerCreator
    ? game.metadata.joiner
    : game.metadata.creator;

  if (opponentAddress.toLowerCase() === SINGLE_PLAYER_MATCH_ADDRESS.toLowerCase()) {
    return "AI";
  }

  return truncateAddress(opponentAddress);
}
