"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS } from "./useTournament";
import type { TournamentMatch } from "../types/types";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const CHAIN_ID = baseSepolia.id;

interface TournamentMatchRef {
  tournamentId: bigint;
  matchId: bigint;
}

/** Returns the tournament match that owns this gameId, or null if it's not a tournament game. */
export function useTournamentMatchForGame(gameId: bigint | null): TournamentMatchRef | null {
  const { data: countRaw } = useReadContract({
    address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
    abi: TOURNAMENT_ABI,
    functionName: "tournamentCount",
    chainId: CHAIN_ID,
    query: { staleTime: 30_000 },
  });

  const count = typeof countRaw === "bigint" ? Number(countRaw) : 0;

  const bracketContracts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "getBracket" as const,
        args: [BigInt(i + 1)],
        chainId: CHAIN_ID,
      })),
    [count],
  );

  const { data: bracketsRaw } = useReadContracts({
    contracts: bracketContracts,
    query: { enabled: count > 0 && gameId !== null, staleTime: 30_000 },
  });

  return useMemo(() => {
    if (!gameId || !bracketsRaw) return null;
    for (let i = 0; i < bracketsRaw.length; i++) {
      const r = bracketsRaw[i];
      if (r?.status !== "success" || !r.result) continue;
      const matches = r.result as TournamentMatch[];
      for (const match of matches) {
        if (match.gameId === gameId) {
          return { tournamentId: BigInt(i + 1), matchId: match.matchId };
        }
      }
    }
    return null;
  }, [gameId, bracketsRaw]);
}
