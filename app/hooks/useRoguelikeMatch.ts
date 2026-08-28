"use client";

import { useCallback } from "react";
import { useWriteContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { RoguelikePosition } from "../types/roguelike";

const CHAIN_ID = baseSepolia.id;
const ROGUELIKE_MATCH_ABI = CONTRACT_ABIS.ROGUELIKE_MATCH as Abi;
export const ROGUELIKE_MATCH_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[
  CHAIN_ID
].ROGUELIKE_MATCH as `0x${string}`;

// takeAITurn is the same underlying Game/AIBehavior cost as
// SinglePlayerMatch.takeAITurn (see useSinglePlayerMatch.ts) — same padded
// limit.
const TAKE_AI_TURN_GAS_LIMIT = 2_500_000n;

// enterCombatNode is the call that actually places the AI fleet and starts
// the Game session (startRun itself only reserves the human roster via
// Fleets, no AI placement) — same cost shape as SinglePlayerMatch.
// startNodeMatch, so budget the same generous limit.
const ENTER_COMBAT_NODE_GAS_LIMIT = 5_500_000n;

export function useRoguelikeMatchContract() {
  return {
    address: ROGUELIKE_MATCH_ADDRESS,
    abi: ROGUELIKE_MATCH_ABI,
    chainId: CHAIN_ID,
  };
}

export function useRoguelikeMatch() {
  const { writeContractAsync } = useWriteContract();

  const startRun = useCallback(
    (campaignId: bigint, shipIds: bigint[]) =>
      writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName: "startRun",
        args: [campaignId, shipIds],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  const enterCombatNode = useCallback(
    (targetNodeId: bigint, positions: RoguelikePosition[]) =>
      writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName: "enterCombatNode",
        args: [targetNodeId, positions],
        chainId: CHAIN_ID,
        gas: ENTER_COMBAT_NODE_GAS_LIMIT,
      }),
    [writeContractAsync],
  );

  const enterResupplyNode = useCallback(
    (targetNodeId: bigint) =>
      writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName: "enterResupplyNode",
        args: [targetNodeId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  // gameId = 0 if no match is currently active (between nodes); the active
  // gameId if retreating mid-combat.
  const retreatRun = useCallback(
    (gameId: bigint) =>
      writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName: "retreatRun",
        args: [gameId],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  const takeAITurn = useCallback(
    (gameId: bigint) =>
      writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName: "takeAITurn",
        args: [gameId],
        chainId: CHAIN_ID,
        gas: TAKE_AI_TURN_GAS_LIMIT,
      }),
    [writeContractAsync],
  );

  return { startRun, enterCombatNode, enterResupplyNode, retreatRun, takeAITurn };
}
