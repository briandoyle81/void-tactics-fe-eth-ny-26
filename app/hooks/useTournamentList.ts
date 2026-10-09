"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { eventAbi, useCombinedEventWatch, type DecodedLog } from "./useCombinedEventWatch";
import { usePageVisible } from "./usePageVisible";
import { useMemo, useCallback } from "react";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS } from "./useTournament";
import type { TournamentSummary, TournamentState } from "../types/types";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const CHAIN_ID = baseSepolia.id;

const TOURNAMENT_ADDRESSES = [BASE_SEPOLIA_TOURNAMENT_ADDRESS] as const;
const TOURNAMENT_LIST_EVENTS = [
  "TournamentCreated",
  "TournamentStarted",
  "TournamentFinalized",
  "TournamentCancelled",
  "Registered",
].map((name) => eventAbi(TOURNAMENT_ABI, name));
const TOURNAMENT_LIST_POLL_MS = 20_000;

/**
 * All tournaments, kept live by event watchers. Pass `{ watch: false }` for
 * a glance (e.g. the Command Deck's open-tournament count): each watcher
 * polls the RPC continuously, which is wasted on a screen that only shows a
 * number.
 */
export function useTournamentList({ watch = true, enabled = true }: { watch?: boolean; enabled?: boolean } = {}) {
  const { data: countRaw, isLoading: countLoading, refetch: refetchCount } = useReadContract({
    address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
    abi: TOURNAMENT_ABI,
    functionName: "tournamentCount",
    chainId: CHAIN_ID,
    query: { enabled, staleTime: 10_000 },
  });

  const count = typeof countRaw === "bigint" ? Number(countRaw) : 0;

  const summaryContracts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "getTournamentSummary" as const,
        args: [BigInt(i + 1)],
        chainId: CHAIN_ID,
      })),
    [count],
  );

  const { data: summariesRaw, isLoading: summariesLoading, refetch: refetchSummaries } = useReadContracts({
    contracts: summaryContracts,
    query: { enabled: enabled && count > 0, staleTime: 10_000 },
  });

  const tournaments: TournamentSummary[] = useMemo(() => {
    if (!summariesRaw) return [];
    return summariesRaw
      .map((r, i) => {
        if (r.status !== "success" || !r.result) return null;
        const [state, creator, prizePool, registrantCount, totalRounds, champion, runnerUp] =
          r.result as [number, `0x${string}`, bigint, bigint, number, `0x${string}`, `0x${string}`];
        return {
          tournamentId: BigInt(i + 1),
          state: state as TournamentState,
          creator,
          prizePool,
          registrantCount,
          totalRounds,
          champion,
          runnerUp,
        } satisfies TournamentSummary;
      })
      .filter((t): t is TournamentSummary => t !== null);
  }, [summariesRaw]);

  // One combined log poll for the list's events, paused while hidden. A new
  // tournament refetches the count (summaryContracts then picks up the new
  // entry); state changes refetch the summaries.
  const isPageVisible = usePageVisible();
  const onLogs = useCallback(
    (logs: DecodedLog[]) => {
      if (logs.some((log) => log.eventName === "TournamentCreated")) void refetchCount();
      else if (logs.length > 0) void refetchSummaries();
    },
    [refetchCount, refetchSummaries],
  );
  useCombinedEventWatch({
    chainId: CHAIN_ID,
    addresses: TOURNAMENT_ADDRESSES,
    events: TOURNAMENT_LIST_EVENTS,
    enabled: enabled && watch && isPageVisible,
    pollingInterval: TOURNAMENT_LIST_POLL_MS,
    onLogs,
  });

  const refetch = useCallback(async () => {
    const result = await refetchCount();
    const newCount = typeof result.data === "bigint" ? Number(result.data) : 0;
    if (newCount > 0) await refetchSummaries();
  }, [refetchCount, refetchSummaries]);

  return { tournaments, isLoading: countLoading || (count > 0 && summariesLoading), refetch };
}
