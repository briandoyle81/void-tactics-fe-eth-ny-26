import { useCallback, useMemo, useRef } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES_BY_CHAIN_ID,
  ZERO_ADDRESS,
  getContractAddresses,
} from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { GameDataView } from "../types/types";
import {
  keepUnchangedGameSnapshot,
  keepUnchangedGamesList,
  normalizeGameDataView,
} from "../utils/normalizeGameDataView";

function getGameEngineRegistryAddress(chainId: number): `0x${string}` {
  const addresses = getContractAddresses(chainId) as Record<
    string,
    `0x${string}` | undefined
  >;
  return addresses.GAME_ENGINE_REGISTRY ?? ZERO_ADDRESS;
}

/**
 * Trustless Game-engine lookup for an existing gameId. Falls back to the
 * currently-known Game address when the registry is missing or returns
 * address(0). See
 * docs/eth-global-remote/frontend-handoff-engine-registry-and-redeploy-2026-09-30.md §2.
 */
export function useEngineOfGame(
  gameId: number | bigint | undefined,
  chainIdOverride?: number,
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const fallbackGame = useMemo(
    () => getContractAddresses(activeChainId).GAME as `0x${string}`,
    [activeChainId],
  );
  const registryAddress = useMemo(
    () => getGameEngineRegistryAddress(activeChainId),
    [activeChainId],
  );
  const enabled =
    registryAddress !== ZERO_ADDRESS &&
    gameId != null &&
    Number(gameId) > 0;
  const args = useMemo(() => [BigInt(gameId ?? 0)] as const, [gameId]);

  const { data } = useReadContract({
    address: registryAddress,
    abi: CONTRACT_ABIS.GAME_ENGINE_REGISTRY as Abi,
    chainId: activeChainId,
    functionName: "engineOfGame",
    args,
    query: {
      enabled,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      notifyOnChangeProps: ["data", "error"],
    },
  });

  const recorded = data as `0x${string}` | undefined;
  if (recorded && recorded !== ZERO_ADDRESS) return recorded;
  return fallbackGame;
}

// Hook for reading contract data
// `chainIdOverride` pins to a specific chain instead of following the wallet
// or header network picker — needed anywhere a game is known to live on a
// specific chain (currently: everywhere, since Game is Base-Sepolia-only
// while multi-chain support is temporarily disabled — see networks.ts).
// Optional `gameId` resolves the Game engine that actually serves that
// match via GameEngineRegistry (falls back to the current Game address).
export function useGameContract(
  chainIdOverride?: number,
  gameId?: number | bigint,
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const address = useEngineOfGame(gameId, chainIdOverride);

  return {
    address,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
  };
}

// `flee`/`endGameOnTimeout` moved off Game onto PvPMatch (the PvP-specific
// game orchestrator). PvPMatch is only deployed on Base Sepolia today, same
// as SinglePlayerMatch/AIEncounters — pin to that chain directly rather than
// going through the chain-generic address map (matches useTournamentAdmin.ts).
export function usePvPMatchContract() {
  return {
    address: CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
      .PVP_MATCH as `0x${string}`,
    abi: CONTRACT_ABIS.PVP_MATCH as Abi,
    chainId: baseSepolia.id,
  };
}

/** owner()-gated admin controls (Game.setHealCapPercent, PvPMatch.setWinEffects) check this before rendering, same gate LobbyAdminPanel.tsx uses. */
export function useGameOwner() {
  const result = useGameRead("owner");
  return { ...result, data: result.data as `0x${string}` | undefined };
}

export function usePvPMatchOwner() {
  const { address, abi, chainId } = usePvPMatchContract();
  const result = useReadContract({ address, abi, chainId, functionName: "owner" });
  return { ...result, data: result.data as `0x${string}` | undefined };
}

/** Global heal ceiling (see contracts/SpecialEffectsLib.sol) — caps any heal effect, in any mode, at this % of a ship's max HP. Defaults to 100 (no extra cap). */
export function useHealCapPercent() {
  const result = useGameRead("healCapPercent");
  return { ...result, data: result.data as number | undefined };
}

// Hook for reading contract data with proper typing
// `chainIdOverride` — see useGameContract above.
export function useGameRead(
  functionName: string,
  args?: readonly unknown[],
  options?: {
    query?: {
      enabled?: boolean;
      refetchOnWindowFocus?: boolean;
      staleTime?: number;
      notifyOnChangeProps?: ("data" | "error")[];
    };
  },
  chainIdOverride?: number,
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const address = useMemo(
    () => getContractAddresses(activeChainId).GAME as `0x${string}`,
    [activeChainId],
  );

  return useReadContract({
    address,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useGameWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type GameReadFunction =
  | "gameCount"
  | "playerGames"
  | "getGame"
  | "getGamesFromIds"
  | "games";

// Specific hooks for common functions
export function useGameCount() {
  return useGameRead("gameCount");
}

export function useGetGamesForPlayer(
  playerAddress: string,
  chainIdOverride?: number,
  options?: { enabled?: boolean },
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const address = useMemo(
    () => getContractAddresses(activeChainId).GAME as `0x${string}`,
    [activeChainId],
  );
  const args = useMemo(() => [playerAddress] as const, [playerAddress]);
  const snapshotRef = useRef<GameDataView[] | undefined>(undefined);
  const selectedAddressRef = useRef(playerAddress);
  if (selectedAddressRef.current !== playerAddress) {
    selectedAddressRef.current = playerAddress;
    snapshotRef.current = undefined;
  }
  const selectGames = useCallback((raw: unknown) => {
    if (!Array.isArray(raw)) {
      snapshotRef.current = undefined;
      return [] as GameDataView[];
    }
    const next = (raw as GameDataView[])
      .filter((g): g is GameDataView => g != null && typeof g === "object")
      .map(normalizeGameDataView);
    const kept = keepUnchangedGamesList(snapshotRef.current, next);
    snapshotRef.current = kept;
    return kept;
  }, []);
  const enabled =
    Boolean(playerAddress) &&
    playerAddress !== ZERO_ADDRESS &&
    playerAddress !== "0x0" &&
    (options?.enabled ?? true);
  return useReadContract({
    address,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
    functionName: "getGamesForPlayer",
    args,
    query: {
      enabled,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      notifyOnChangeProps: ["data", "error"],
      select: selectGames,
    },
  });
}

export function useGetGame(gameId: number, chainIdOverride?: number) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const address = useEngineOfGame(gameId, chainIdOverride);
  const args = useMemo(() => [BigInt(gameId)] as const, [gameId]);
  const snapshotRef = useRef<GameDataView | undefined>(undefined);
  const selectedGameIdRef = useRef(gameId);
  if (selectedGameIdRef.current !== gameId) {
    selectedGameIdRef.current = gameId;
    snapshotRef.current = undefined;
  }
  const selectGame = useCallback((raw: unknown) => {
    const next = normalizeGameDataView(raw as GameDataView);
    const kept = keepUnchangedGameSnapshot(snapshotRef.current, next);
    snapshotRef.current = kept;
    return kept;
  }, []);
  return useReadContract({
    address,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
    functionName: "getGame",
    args,
    query: {
      enabled: gameId > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      notifyOnChangeProps: ["data", "error"],
      select: selectGame,
    },
  });
}

/** How many real special slots a faction has (0 = None). Owner-set, currently 3 for both variants. */
export function useMaxSpecialSlot(variant: number | undefined) {
  const args = useMemo(
    () => (variant != null && variant > 0 ? ([variant] as const) : undefined),
    [variant],
  );
  const result = useGameRead("maxSpecialSlot", args, {
    query: { enabled: variant != null && variant > 0 },
  });
  const raw = result.data as number | bigint | undefined;
  const parsed = raw == null ? 3 : Number(raw);
  const maxSlot = Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
  return { ...result, maxSlot };
}

export function useGetGamesFromIds(gameIds: number[], chainIdOverride?: number) {
  const args = useMemo(
    () => [gameIds.map((id) => BigInt(id))] as const,
    // gameIds reference must be stable at call sites for this memo to be effective
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameIds],
  );
  const result = useGameRead(
    "getGamesFromIds",
    args,
    { query: { enabled: gameIds.length > 0 } },
    chainIdOverride,
  );
  const data = useMemo(
    () =>
      (result.data as GameDataView[] | undefined)?.map(normalizeGameDataView),
    [result.data],
  );
  return { ...result, data };
}
