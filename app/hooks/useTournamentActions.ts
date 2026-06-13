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

  return { register, start, cancel, claimPrize, claimRefund, createTournament, publicClient };
}
