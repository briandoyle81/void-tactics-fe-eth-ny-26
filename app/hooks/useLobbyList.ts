import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useBlockNumber, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useLobbiesRead, useLobbiesChainParams } from "./useLobbiesContract";
import { getSelectedChainId } from "../config/networks";
import { Lobby } from "../types/types";

export function useLobbyList() {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: activeChainId,
  });
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

  const allLobbyIds = useMemo(() => {
    const ids = new Set<string>();
    (playerLobbyIds.data as readonly bigint[] | undefined)?.forEach((id) =>
      ids.add(id.toString()),
    );
    (openLobbyIds.data as readonly bigint[] | undefined)?.forEach((id) =>
      ids.add(id.toString()),
    );
    return Array.from(ids, (s) => BigInt(s));
  }, [playerLobbyIds.data, openLobbyIds.data]);

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

  const processLobbyData = useCallback((): Lobby[] => {
    return (lobbyStructs.data ?? [])
      .map((r) => r.result as Lobby | undefined)
      .filter(
        (l): l is Lobby =>
          !!l && typeof l === "object" && !!l.basic && l.basic.id != null,
      );
  }, [lobbyStructs.data]);

  const prevChainIdRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevChainIdRef.current;
    prevChainIdRef.current = activeChainId;
    if (prev === null || prev === activeChainId) return;
    setLobbies([]);
    setError(null);
  }, [activeChainId]);

  // Invalidate on each new block, debounced to at most once per 5 s.
  // Avoids the redundant dual-invalidation (block + interval) on fast chains.
  const lastInvalidatedRef = useRef(0);
  useEffect(() => {
    lastInvalidatedRef.current = 0;
  }, [address, activeChainId]);

  useEffect(() => {
    if (!blockNumber) return;
    const now = Date.now();
    if (now - lastInvalidatedRef.current < 5000) return;
    lastInvalidatedRef.current = now;
    queryClient.invalidateQueries({ queryKey: playerLobbyIds.queryKey });
    queryClient.invalidateQueries({ queryKey: openLobbyIds.queryKey });
    queryClient.invalidateQueries({ queryKey: lobbyStructs.queryKey });
  }, [
    blockNumber,
    queryClient,
    playerLobbyIds.queryKey,
    openLobbyIds.queryKey,
    lobbyStructs.queryKey,
  ]);

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
    // The id-list reads must resolve (and the component re-render, updating
    // allLobbyIds) before lobbyStructs' own contracts array reflects any
    // newly-appeared lobby id — but for the common case (an existing
    // lobby's state changed, id set unchanged), lobbyStructs also needs its
    // own explicit refetch since its query key wouldn't otherwise change.
    await Promise.all([
      playerLobbyIds.refetch(),
      openLobbyIds.refetch(),
      lobbyStructs.refetch(),
    ]);
    const processed = processLobbyData();
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
