import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useLobbiesRead, useLobbiesChainParams } from "./useLobbiesContract";
import { getSelectedChainId } from "../config/networks";
import { Lobby } from "../types/types";
import { usePageVisible, useWindowFocused } from "./usePageVisible";

// Open-lobby refresh. Was every block (eth_blockNumber polled every ~4s plus
// three reads per block, even in hidden tabs). Lobby events also refresh it
// through ContractEventsHost; this is the fallback for lobbies other players
// open or close.
const LOBBY_LIST_POLL_MS = 15_000;
const LOBBY_LIST_BLURRED_POLL_MS = 60_000;

export function useLobbyList() {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const queryClient = useQueryClient();
  const {
    address: lobbiesAddress,
    abi: lobbiesAbi,
    chainId: lobbiesChainId,
  } = useLobbiesChainParams();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // getAllLobbiesForPlayerWithDupes was removed (see
  // docs/update/Frontend_Updates_2026-08-27.md §4) — its replacement is two
  // id-list reads merged client-side, then a batched getLobby(id) per id for
  // the full structs. Both remain the correct call for normal (non-whale-
  // scale) usage per the doc; no need for the new paginated variant here.
  const playerLobbyIds = useLobbiesRead(
    "getPlayerLobbies",
    address ? [address] : undefined,
    { query: { enabled: !!address } },
  );
  const openLobbyIds = useLobbiesRead("getOpenLobbies");

  const stickyMineIdsKey = useMemo(() => {
    if (!address) return "";
    const me = address.toLowerCase();
    return lobbies
      .filter((lobby) => {
        const creator = lobby.basic.creator?.toLowerCase();
        const joiner = lobby.players.joiner?.toLowerCase();
        return creator === me || joiner === me;
      })
      .map((lobby) => lobby.basic.id.toString())
      .sort()
      .join(",");
  }, [lobbies, address]);

  const allLobbyIds = useMemo(() => {
    const ids = new Set<string>();
    (playerLobbyIds.data as readonly bigint[] | undefined)?.forEach((id) =>
      ids.add(id.toString()),
    );
    (openLobbyIds.data as readonly bigint[] | undefined)?.forEach((id) =>
      ids.add(id.toString()),
    );
    // After join, the lobby leaves Open before getPlayerLobbies includes it.
    // Keep any lobby we already show as ours so the card does not vanish
    // (and JOIN does not come back) until the player list catches up.
    if (stickyMineIdsKey) {
      for (const id of stickyMineIdsKey.split(",")) ids.add(id);
    }
    return Array.from(ids, (s) => BigInt(s));
  }, [playerLobbyIds.data, openLobbyIds.data, stickyMineIdsKey]);

  const lobbyStructs = useReadContracts({
    contracts: allLobbyIds.map((id) => ({
      address: lobbiesAddress,
      abi: lobbiesAbi,
      chainId: lobbiesChainId,
      functionName: "getLobby" as const,
      args: [id] as const,
    })),
    query: { enabled: allLobbyIds.length > 0 },
  });

  const processLobbyData = useCallback(
    (data: typeof lobbyStructs.data = lobbyStructs.data): Lobby[] => {
      return (data ?? [])
        .map((r) => r.result as Lobby | undefined)
        .filter(
          (l): l is Lobby =>
            !!l && typeof l === "object" && !!l.basic && l.basic.id != null,
        );
    },
    [lobbyStructs.data],
  );

  const prevChainIdRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevChainIdRef.current;
    prevChainIdRef.current = activeChainId;
    if (prev === null || prev === activeChainId) return;
    setLobbies([]);
    setError(null);
  }, [activeChainId]);

  // Paused while the tab is hidden; slower while the window is unfocused.
  // Query keys go through a ref: wagmi rebuilds them each render, which
  // would otherwise restart the timer before it ever fires.
  const isPageVisible = usePageVisible();
  const isWindowFocused = useWindowFocused();
  const lobbyQueryKeysRef = useRef([playerLobbyIds.queryKey, openLobbyIds.queryKey, lobbyStructs.queryKey]);
  lobbyQueryKeysRef.current = [playerLobbyIds.queryKey, openLobbyIds.queryKey, lobbyStructs.queryKey];
  useEffect(() => {
    if (!isPageVisible) return;
    const interval = setInterval(
      () => {
        for (const queryKey of lobbyQueryKeysRef.current) {
          void queryClient.invalidateQueries({ queryKey });
        }
      },
      isWindowFocused ? LOBBY_LIST_POLL_MS : LOBBY_LIST_BLURRED_POLL_MS,
    );
    return () => clearInterval(interval);
  }, [isPageVisible, isWindowFocused, queryClient]);

  // Process the lobby data when it changes
  useEffect(() => {
    setLobbies(processLobbyData());
    setIsLoading(
      playerLobbyIds.isLoading || openLobbyIds.isLoading || lobbyStructs.isLoading,
    );
    setError(
      playerLobbyIds.error?.message ||
        openLobbyIds.error?.message ||
        lobbyStructs.error?.message ||
        null,
    );
  }, [
    processLobbyData,
    playerLobbyIds.isLoading,
    openLobbyIds.isLoading,
    lobbyStructs.isLoading,
    playerLobbyIds.error,
    openLobbyIds.error,
    lobbyStructs.error,
    address,
    activeChainId,
  ]);

  const refetch = async (): Promise<Lobby[]> => {
    // Id lists first so a join that leaves Open can land in Player before we
    // decide which structs to keep. Then use the *refetch result*, not the
    // hook's closed-over `lobbyStructs.data` — that snapshot is from this
    // render and still has the pre-join joiner/status, which made JOIN
    // re-enable while the card still looked open.
    await Promise.all([playerLobbyIds.refetch(), openLobbyIds.refetch()]);
    const structsResult = await lobbyStructs.refetch();
    const processed = processLobbyData(structsResult.data);
    setLobbies(processed);
    return processed;
  };

  return {
    lobbies,
    isLoading,
    error,
    refetch,
  };
}
