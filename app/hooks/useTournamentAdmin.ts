"use client";

import { useWriteContract, usePublicClient } from "wagmi";
import { useCallback } from "react";
import { baseSepolia } from "viem/chains";
import { parseEventLogs, type Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS } from "./useTournament";
import type { TournamentConfig } from "../types/types";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const LOBBIES_ABI = CONTRACT_ABIS.LOBBIES as Abi;
const CHAIN_ID = baseSepolia.id;

const ZERO_BLOB = ("0x" + "0".repeat(64)) as `0x${string}`;

export function useTournamentAdmin() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const createMatchLobby = useCallback(
    async (
      tournamentId: bigint,
      matchId: bigint,
      player1: `0x${string}`,
      player2: `0x${string}`,
      cfg: TournamentConfig,
    ) => {
      const lobbiesAddress = getContractAddresses(CHAIN_ID).LOBBIES as `0x${string}`;

      // Step 1: create the lobby
      const lobbyHash = await writeContractAsync({
        address: lobbiesAddress,
        abi: LOBBIES_ABI,
        functionName: "createLobbyForAddresses",
        args: [player1, player2, cfg.costLimit, cfg.turnTime, cfg.selectedMapId, cfg.maxScore],
        chainId: CHAIN_ID,
      });

      // Step 2: extract lobbyId from LobbyCreated event
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: lobbyHash });
      const logs = parseEventLogs({ abi: LOBBIES_ABI, logs: receipt.logs, eventName: "LobbyCreated" });
      const lobbyId = (logs[0]?.args as { lobbyId?: bigint } | undefined)?.lobbyId;
      if (!lobbyId) throw new Error("LobbyCreated event not found in receipt");

      // Step 3: assign the game to the match. Wait for this receipt too
      // (not just step 1's) before resolving — callers treat this promise
      // settling as "the whole thing is done," which wasn't true while it
      // only resolved on this write's send.
      const assignHash = await writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "assignMatchGame",
        args: [tournamentId, matchId, lobbyId],
        chainId: CHAIN_ID,
      });
      await publicClient!.waitForTransactionReceipt({ hash: assignHash });
      return assignHash;
    },
    [writeContractAsync, publicClient],
  );

  const submitResult = useCallback(
    async (tournamentId: bigint, matchId: bigint, walrusBlobId: `0x${string}` = ZERO_BLOB) => {
      const hash = await writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "recordResult",
        args: [tournamentId, matchId, walrusBlobId],
        chainId: CHAIN_ID,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const resolveDraw = useCallback(
    async (tournamentId: bigint, matchId: bigint, walrusBlobId: `0x${string}` = ZERO_BLOB) => {
      const hash = await writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "resolveDraw",
        args: [tournamentId, matchId, walrusBlobId],
        chainId: CHAIN_ID,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const finalize = useCallback(
    async (tournamentId: bigint) => {
      const hash = await writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "finalize",
        args: [tournamentId],
        chainId: CHAIN_ID,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  return { createMatchLobby, submitResult, resolveDraw, finalize };
}
