"use client";

import { useCallback } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { AIShipInfo, Archetype } from "../types/types";

// SinglePlayerMatch is Base Sepolia only today — pin to that chain directly
// rather than following the connected wallet/picker chain, same pattern as
// useTournamentAdmin.ts's CHAIN_ID.
const CHAIN_ID = baseSepolia.id;
const SINGLE_PLAYER_MATCH_ABI = CONTRACT_ABIS.SINGLE_PLAYER_MATCH as Abi;

export const SINGLE_PLAYER_MATCH_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[
  CHAIN_ID
].SINGLE_PLAYER_MATCH as `0x${string}`;

// The on-chain AI logic (pathfinding + combat resolution) makes takeAITurn
// a genuinely expensive call — measured via eth_estimateGas at ~1.41M gas
// for a single call on a real game, not the few-hundred-k typical of most
// writes here. Auto-estimation isn't reliable for this specific call under
// Dynamic's server-side (secure-enclave) signing path — set an explicit,
// generously-padded limit so it's never silently underestimated and leaves
// the AI's turn stuck mid-loop with no on-chain error at all. Confirmed
// flat cost regardless of map (per contracts-side update), so one constant
// covers every node.
const TAKE_AI_TURN_GAS_LIMIT = 2_500_000n;

// startNodeMatch's cost scales with the node's AI fleet size/complexity —
// confirmed up to ~4M gas on the most expensive map ("bastion") after the
// fleet-size rebalance. Unlike takeAITurn this isn't flat across nodes, but
// there's no per-node cost table wired into the frontend (and unused gas
// from the limit isn't spent, just capped), so one generously-padded
// constant covers every node rather than trying to track per-map costs.
const START_NODE_MATCH_GAS_LIMIT = 5_500_000n;

export function useSinglePlayerMatchContract() {
  return {
    address: SINGLE_PLAYER_MATCH_ADDRESS,
    abi: SINGLE_PLAYER_MATCH_ABI,
    chainId: CHAIN_ID,
  };
}

export function useSinglePlayerMatch() {
  const { writeContractAsync } = useWriteContract();

  // Builds the human's fleet and starts the Game session in one call —
  // replaces the old acceptMatch/setupAIFleet two-step (removed from the
  // ABI entirely). Returns the tx hash only; the caller must await the
  // receipt and decode `gameId` from the NodeMatchStarted event rather than
  // computing it (the offset is an implementation detail, not something to
  // hardcode — see docs/singleplayer-frontend-integration.md).
  const startNodeMatch = useCallback(
    (nodeId: bigint, shipIds: bigint[], positions: { row: number; col: number }[]) =>
      writeContractAsync({
        address: SINGLE_PLAYER_MATCH_ADDRESS,
        abi: SINGLE_PLAYER_MATCH_ABI,
        functionName: "startNodeMatch",
        args: [nodeId, shipIds, positions],
        chainId: CHAIN_ID,
        gas: START_NODE_MATCH_GAS_LIMIT,
      }),
    [writeContractAsync],
  );

  const takeAITurn = useCallback(
    (gameId: bigint) =>
      writeContractAsync({
        address: SINGLE_PLAYER_MATCH_ADDRESS,
        abi: SINGLE_PLAYER_MATCH_ABI,
        functionName: "takeAITurn",
        args: [gameId],
        chainId: CHAIN_ID,
        gas: TAKE_AI_TURN_GAS_LIMIT,
      }),
    [writeContractAsync],
  );

  return { startNodeMatch, takeAITurn };
}

// Maps a game back to the campaign node it was launched from — recorded
// on-chain by startNodeMatch. Used for the mission-result screen (which
// node was this, so it can show the right title / offer "return to
// campaign"). Node ids start at 1; 0 means "not a node match" (defensively
// handled even though every single-player game should have one).
export function useGameIdToNodeId(gameId: bigint | undefined) {
  const result = useReadContract({
    address: SINGLE_PLAYER_MATCH_ADDRESS,
    abi: SINGLE_PLAYER_MATCH_ABI,
    chainId: CHAIN_ID,
    functionName: "gameIdToNodeId",
    args: gameId != null ? [gameId] : undefined,
    query: { enabled: gameId != null },
  });
  return { ...result, data: result.data as bigint | undefined };
}

// aiShipInfo(uint256) returns three separate named outputs (archetype,
// variant, special), not a single struct — viem/wagmi decode that as a
// positional tuple, not an object, so map it explicitly.
export function useAIShipInfo(shipId: bigint | undefined) {
  const result = useReadContract({
    address: SINGLE_PLAYER_MATCH_ADDRESS,
    abi: SINGLE_PLAYER_MATCH_ABI,
    chainId: CHAIN_ID,
    functionName: "aiShipInfo",
    args: shipId != null ? [shipId] : undefined,
    query: { enabled: shipId != null },
  });
  const raw = result.data as readonly [Archetype, number, number] | undefined;
  const data: AIShipInfo | undefined = raw
    ? { archetype: raw[0], variant: raw[1], special: raw[2] }
    : undefined;
  return { ...result, data };
}
