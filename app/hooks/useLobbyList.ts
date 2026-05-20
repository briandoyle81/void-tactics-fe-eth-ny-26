import { useState, useEffect, useRef } from "react";
import { useAccount, useBlockNumber } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useLobbiesRead } from "./useLobbiesContract";
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

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the new single function that returns all lobbies for a player with duplicates
  const lobbiesData = useLobbiesRead("getAllLobbiesForPlayerWithDupes", [
    address || "0x0",
  ]);

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
    queryClient.invalidateQueries({ queryKey: lobbiesData.queryKey });
  }, [blockNumber, queryClient, lobbiesData.queryKey]);

  // Process the lobby data when it changes
  useEffect(() => {
    setLobbies(processLobbyData(lobbiesData.data));
    setIsLoading(lobbiesData.isLoading);
    setError(lobbiesData.error?.message || null);
  }, [
    lobbiesData.data,
    lobbiesData.isLoading,
    lobbiesData.error,
    address,
    activeChainId,
  ]);

  const processLobbyData = (data: unknown): Lobby[] => {
    if (!data || !Array.isArray(data)) return [];
    const fetchedLobbies: Lobby[] = [];
    const seenIds = new Set<string>();
    data.forEach((lobbyData, index) => {
      if (
        lobbyData &&
        typeof lobbyData === "object" &&
        (lobbyData as { basic?: { id?: unknown } }).basic &&
        (lobbyData as { basic: { id: unknown } }).basic.id
      ) {
        try {
          const lobby = lobbyData as Lobby;
          const lobbyId = lobby.basic.id.toString();
          if (!seenIds.has(lobbyId)) {
            seenIds.add(lobbyId);
            fetchedLobbies.push(lobby);
          }
        } catch (err) {
          console.error(`Error converting lobby at index ${index}:`, err);
        }
      }
    });
    return fetchedLobbies;
  };

  const refetch = async (): Promise<Lobby[]> => {
    const result = await lobbiesData.refetch();
    const processed = processLobbyData(result.data);
    if (processed.length > 0 || result.data !== undefined) {
      setLobbies(processed);
    }
    return processed;
  };

  return {
    lobbies,
    isLoading,
    error,
    refetch,
  };
}
