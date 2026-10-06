import type { Abi } from "viem";
import { baseSepolia } from "viem/chains";
import type { Config } from "wagmi";
import { readContractQueryOptions } from "wagmi/query";
import type { QueryClient } from "@tanstack/react-query";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { apiFetch } from "../lib/apiFetch";
import { GAMES_WEB2_PLAYER_QUERY_KEY } from "../hooks/useGamesWeb2";
import type { Web2GameDataView } from "../types/web2Game";

/**
 * After a mission-launch receipt, re-fetches the exact cached query that
 * usePlayerGames (Games tab) reads — getGamesForPlayer on Base Sepolia,
 * cached with staleTime: Infinity — until it contains `gameId`. Navigating
 * before that left the Games tab unable to find the new game (its read was
 * stale, or a lagging RPC node hadn't indexed the block yet), so it fell
 * back to the list view. Resolves true once found, false on timeout.
 */
export async function waitForPlayerGame({
  config,
  queryClient,
  playerAddress,
  gameId,
  timeoutMs = 20_000,
}: {
  config: Config;
  queryClient: QueryClient;
  playerAddress: string;
  gameId: bigint;
  timeoutMs?: number;
}): Promise<boolean> {
  const options = readContractQueryOptions(config, {
    address: getContractAddresses(baseSepolia.id).GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: baseSepolia.id,
    functionName: "getGamesForPlayer",
    args: [playerAddress],
  });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const raw = await queryClient.fetchQuery({ ...options, staleTime: 0 });
      const found =
        Array.isArray(raw) &&
        raw.some((game) => {
          const id = (game as { metadata?: { gameId?: bigint } } | null)?.metadata?.gameId;
          return id != null && BigInt(id) === gameId;
        });
      if (found) return true;
    } catch (error) {
      console.warn("waitForPlayerGame: read failed, retrying", error);
    }
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Web2 counterpart: refreshes the cached /api/games list GamesWeb2.tsx reads
 * until it contains `gameId`. GamesWeb2's restore effect drops a pending
 * selection the first time it doesn't find the game, so the list must have
 * it before navigating. The server is consistent, so this normally succeeds
 * on the first fetch; the loop only covers transient request failures.
 */
export async function waitForPlayerGameWeb2({
  queryClient,
  gameId,
  timeoutMs = 10_000,
}: {
  queryClient: QueryClient;
  gameId: number;
  timeoutMs?: number;
}): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const games = await queryClient.fetchQuery({
        queryKey: GAMES_WEB2_PLAYER_QUERY_KEY,
        queryFn: () => apiFetch<Web2GameDataView[]>("/api/games"),
        staleTime: 0,
      });
      if (games.some((game) => Number(game.metadata.gameId) === gameId)) return true;
    } catch (error) {
      console.warn("waitForPlayerGameWeb2: read failed, retrying", error);
    }
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
