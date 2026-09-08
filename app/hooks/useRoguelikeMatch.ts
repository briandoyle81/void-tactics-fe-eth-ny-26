"use client";

import { useCallback } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
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
  const config = useConfig();

  // Callers refetch run/node state right after these resolve, so each write
  // waits for its receipt here rather than just returning the submitted
  // hash — otherwise the refetch races the still-pending transaction and
  // reads stale state.
  const writeAndWait = useCallback(
    async (functionName: string, args: unknown[], gas?: bigint) => {
      const hash = await writeContractAsync({
        address: ROGUELIKE_MATCH_ADDRESS,
        abi: ROGUELIKE_MATCH_ABI,
        functionName,
        args,
        chainId: CHAIN_ID,
        ...(gas != null ? { gas } : {}),
      });
      await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
      return hash;
    },
    [writeContractAsync, config],
  );

  const startRun = useCallback(
    (campaignId: bigint, shipIds: bigint[]) =>
      writeAndWait("startRun", [campaignId, shipIds]),
    [writeAndWait],
  );

  const enterCombatNode = useCallback(
    (targetNodeId: bigint, positions: RoguelikePosition[]) =>
      writeAndWait("enterCombatNode", [targetNodeId, positions], ENTER_COMBAT_NODE_GAS_LIMIT),
    [writeAndWait],
  );

  const enterResupplyNode = useCallback(
    (targetNodeId: bigint) => writeAndWait("enterResupplyNode", [targetNodeId]),
    [writeAndWait],
  );

  // gameId = 0 if no match is currently active (between nodes); the active
  // gameId if retreating mid-combat.
  const retreatRun = useCallback(
    (gameId: bigint) => writeAndWait("retreatRun", [gameId]),
    [writeAndWait],
  );

  const takeAITurn = useCallback(
    (gameId: bigint) => writeAndWait("takeAITurn", [gameId], TAKE_AI_TURN_GAS_LIMIT),
    [writeAndWait],
  );

  return { startRun, enterCombatNode, enterResupplyNode, retreatRun, takeAITurn };
}
