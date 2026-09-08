"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { SINGLE_PLAYER_MATCH_ADDRESS } from "./useSinglePlayerMatch";
import { usePlayerGames } from "./usePlayerGames";

const CHAIN_ID = baseSepolia.id;
const SINGLE_PLAYER_MATCH_ABI = CONTRACT_ABIS.SINGLE_PLAYER_MATCH as Abi;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface NodeGameStatus {
  /** An unfinished game already running for this node, if any — "Enter Combat" should resume it. */
  activeGameId: bigint | null;
  isLoading: boolean;
}

// Whether the player already has an in-progress game for this campaign
// node — drives CampaignNodePreview's CTA between "Launch Mission" (no
// game, or the last one ended — replay is allowed) and "Enter Combat"
// (resume the one already running). SinglePlayerMatch only exposes
// game->node (gameIdToNodeId), not the reverse, so this cross-references
// the player's game list against that mapping.
export function useNodeGameStatus(nodeId: bigint): NodeGameStatus {
  const { games, isLoading: gamesLoading } = usePlayerGames();

  const singlePlayerGames = useMemo(
    () =>
      games.filter(
        (g) =>
          g.metadata.orchestrator?.toLowerCase() ===
          SINGLE_PLAYER_MATCH_ADDRESS.toLowerCase(),
      ),
    [games],
  );

  const gameIds = useMemo(
    () => singlePlayerGames.map((g) => g.metadata.gameId),
    [singlePlayerGames],
  );

  const { data: nodeIdResults, isLoading: nodeIdsLoading } = useReadContracts({
    contracts: gameIds.map((id) => ({
      address: SINGLE_PLAYER_MATCH_ADDRESS,
      abi: SINGLE_PLAYER_MATCH_ABI,
      chainId: CHAIN_ID,
      functionName: "gameIdToNodeId" as const,
      args: [id] as const,
    })),
    query: { enabled: gameIds.length > 0 },
  });

  const activeGameId = useMemo(() => {
    if (!nodeIdResults) return null;
    for (let i = 0; i < singlePlayerGames.length; i++) {
      const game = singlePlayerGames[i];
      const gameNodeId = nodeIdResults[i]?.result as bigint | undefined;
      if (gameNodeId === nodeId && game.metadata.winner === ZERO_ADDRESS) {
        return game.metadata.gameId;
      }
    }
    return null;
  }, [nodeIdResults, singlePlayerGames, nodeId]);

  return {
    activeGameId,
    isLoading: gamesLoading || (gameIds.length > 0 && nodeIdsLoading),
  };
}
