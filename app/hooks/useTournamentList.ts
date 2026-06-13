"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS } from "./useTournament";
import type { TournamentSummary, TournamentState } from "../types/types";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const CHAIN_ID = baseSepolia.id;

export function useTournamentList() {
  const { data: countRaw, isLoading: countLoading } = useReadContract({
    address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
    abi: TOURNAMENT_ABI,
    functionName: "tournamentCount",
    chainId: CHAIN_ID,
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

  const { data: summariesRaw, isLoading: summariesLoading } = useReadContracts({
    contracts: summaryContracts,
    query: { enabled: count > 0 },
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

  return { tournaments, isLoading: countLoading || summariesLoading };
}
