"use client";

import { useWriteContract, usePublicClient } from "wagmi";
import { useCallback } from "react";
import { baseSepolia } from "viem/chains";
import { decodeAbiParameters, type Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS } from "./useTournament";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;
const CHAIN_ID = baseSepolia.id;

interface IdKitResult {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
}

export function useTournamentActions() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const register = useCallback(
    async (tournamentId: bigint, entryFee: bigint, idKitResult: IdKitResult) => {
      const [unpackedProof] = decodeAbiParameters(
        [{ type: "uint256[8]" }],
        idKitResult.proof as `0x${string}`,
      );
      return writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "register",
        args: [
          tournamentId,
          BigInt(idKitResult.merkle_root),
          BigInt(idKitResult.nullifier_hash),
          unpackedProof,
        ],
        value: entryFee,
        chainId: CHAIN_ID,
      });
    },
    [writeContractAsync],
  );

  const start = useCallback(
    (tournamentId: bigint) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "start",
        args: [tournamentId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  // Permissionless (like start/recordResult) — reveals the round-1 pairing
  // randomness requested by start() and builds the bracket. Only callable
  // once RandomManager's reveal window has opened (~1 block after start());
  // reverts with TooSoonToReveal before that. Exposed standalone as the
  // manual fallback button for TournamentState.Starting, separate from
  // startAndBuildBracket's auto-chained convenience below.
  const buildBracket = useCallback(
    (tournamentId: bigint) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "buildBracket",
        args: [tournamentId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  // Chains start() -> buildBracket() so clicking "Start Tournament" still
  // feels like one action. buildBracket can't succeed in the same block as
  // start() (RandomManager can't reveal in the same transaction as the
  // request — see RandomManager.sol), so this retries it a few times after
  // start() confirms. If the retry budget runs out, this resolves normally
  // (NOT an error) — start() already succeeded, the tournament is
  // legitimately sitting in Starting, and the UI's manual "Build Bracket"
  // button (shown whenever state is Starting) is the fallback, so a
  // caller must not surface this as a failed Start action.
  const startAndBuildBracket = useCallback(
    async (tournamentId: bigint) => {
      if (!publicClient) throw new Error("No public client");
      const startHash = await writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "start",
        args: [tournamentId],
        chainId: CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: startHash });

      const maxAttempts = 7; // ~21s at 3s intervals, comfortably over the ~12s expected reveal wait
      const delayMs = 3000;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        try {
          const buildHash = await writeContractAsync({
            address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: "buildBracket",
            args: [tournamentId],
            chainId: CHAIN_ID,
          });
          await publicClient.waitForTransactionReceipt({ hash: buildHash });
          return;
        } catch {
          // Most commonly TooSoonToReveal — keep retrying within budget.
        }
      }
    },
    [writeContractAsync, publicClient],
  );

  const cancel = useCallback(
    (tournamentId: bigint) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "cancel",
        args: [tournamentId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  const claimPrize = useCallback(
    (tournamentId: bigint) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "claim",
        args: [tournamentId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  const claimRefund = useCallback(
    (tournamentId: bigint) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "claimRefund",
        args: [tournamentId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  const createTournament = useCallback(
    (
      cfg: {
        entryFee: bigint;
        minPlayers: number;
        maxPlayers: number;
        lastStartTime: bigint;
        costLimit: bigint;
        turnTime: bigint;
        selectedMapId: bigint;
        maxScore: bigint;
      },
      sponsorValue: bigint,
    ) =>
      writeContractAsync({
        address: BASE_SEPOLIA_TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: "createTournament",
        args: [cfg],
        value: sponsorValue,
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  return {
    register,
    start,
    buildBracket,
    startAndBuildBracket,
    cancel,
    claimPrize,
    claimRefund,
    createTournament,
    publicClient,
  };
}
