"use client";

import { useReadContract, useReadContracts, useWatchContractEvent } from "wagmi";
import { useCallback, useMemo } from "react";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { useAccount } from "wagmi";
import { CONTRACT_ABIS } from "../config/contracts";
import type {
  TournamentConfig,
  TournamentMatch,
  TournamentState,
  TournamentSummary,
} from "../types/types";

// Tournament is Base Sepolia only — exported for use in other hooks/components.
export const BASE_SEPOLIA_TOURNAMENT_ADDRESS =
  (process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const CHAIN_ID = baseSepolia.id;

export function useTournament(tournamentId: bigint | null) {
  const { address } = useAccount();
  const enabled = tournamentId !== null;

  const contracts = useMemo(
    () =>
      tournamentId === null
        ? []
        : [
            {
              address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
              abi: TOURNAMENT_ABI,
              functionName: "getTournamentConfig" as const,
              args: [tournamentId],
              chainId: CHAIN_ID,
            },
            {
              address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
              abi: TOURNAMENT_ABI,
              functionName: "getTournamentSummary" as const,
              args: [tournamentId],
              chainId: CHAIN_ID,
            },
            {
              address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
              abi: TOURNAMENT_ABI,
              functionName: "getRegistrants" as const,
              args: [tournamentId],
              chainId: CHAIN_ID,
            },
            {
              address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
              abi: TOURNAMENT_ABI,
              functionName: "getBracket" as const,
              args: [tournamentId],
              chainId: CHAIN_ID,
            },
            ...(address
              ? [
                  {
                    address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
                    abi: TOURNAMENT_ABI,
                    functionName: "isRegistered" as const,
                    args: [tournamentId, address],
                    chainId: CHAIN_ID,
                  },
                  {
                    address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
                    abi: TOURNAMENT_ABI,
                    functionName: "winningsOf" as const,
                    args: [tournamentId, address],
                    chainId: CHAIN_ID,
                  },
                ]
              : []),
          ],
    [tournamentId, address],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled },
  });

  const config = useMemo((): TournamentConfig | undefined => {
    const r = data?.[0];
    if (r?.status !== "success" || !r.result) return undefined;
    const c = r.result as {
      entryFee: bigint; minPlayers: number; maxPlayers: number;
      lastStartTime: bigint; costLimit: bigint; turnTime: bigint;
      selectedMapId: bigint; maxScore: bigint;
    };
    return c;
  }, [data]);

  const summary = useMemo((): TournamentSummary | undefined => {
    if (!tournamentId) return undefined;
    const r = data?.[1];
    if (r?.status !== "success" || !r.result) return undefined;
    const [state, creator, prizePool, registrantCount, totalRounds, champion, runnerUp] =
      r.result as [number, Address, bigint, bigint, number, Address, Address];
    return { tournamentId, state: state as TournamentState, creator, prizePool, registrantCount, totalRounds, champion, runnerUp };
  }, [data, tournamentId]);

  const registrants = useMemo((): Address[] => {
    const r = data?.[2];
    if (r?.status !== "success" || !r.result) return [];
    return r.result as Address[];
  }, [data]);

  const bracket = useMemo((): TournamentMatch[] => {
    const r = data?.[3];
    if (r?.status !== "success" || !r.result) return [];
    return (r.result as TournamentMatch[]);
  }, [data]);

  const isRegistered = useMemo((): boolean => {
    if (!address) return false;
    const r = data?.[4];
    return r?.status === "success" ? Boolean(r.result) : false;
  }, [data, address]);

  const winnings = useMemo((): bigint => {
    if (!address) return 0n;
    const r = data?.[5];
    return r?.status === "success" ? (r.result as bigint) : 0n;
  }, [data, address]);

  // Refresh on any tournament event
  const watchConfig = useMemo(
    () => ({
      address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
      abi: TOURNAMENT_ABI,
      chainId: CHAIN_ID,
    }),
    [],
  );
  const onEvent = useCallback(() => { void refetch(); }, [refetch]);

  useWatchContractEvent({ ...watchConfig, eventName: "Registered", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "TournamentStarted", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "MatchGameAssigned", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "MatchResolved", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "NextRoundMatchCreated", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "TournamentFinalized", onLogs: onEvent });
  useWatchContractEvent({ ...watchConfig, eventName: "TournamentCancelled", onLogs: onEvent });

  return { config, summary, registrants, bracket, isRegistered, winnings, isLoading, refetch };
}
