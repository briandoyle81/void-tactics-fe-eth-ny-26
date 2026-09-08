"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { RoguelikeRun } from "../types/roguelike";

const CHAIN_ID = baseSepolia.id;
const ROGUELIKE_RUN_ABI = CONTRACT_ABIS.ROGUELIKE_RUN as Abi;
export const ROGUELIKE_RUN_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[
  CHAIN_ID
].ROGUELIKE_RUN as `0x${string}`;

export function useRoguelikeRunContract() {
  return {
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
  };
}

export function useGetRoguelikeRun(playerAddress: Address | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
    functionName: "getRun",
    args: playerAddress ? [playerAddress] : undefined,
    query: { enabled: !!playerAddress },
  });
  return { ...result, data: result.data as RoguelikeRun | undefined };
}

export function useHasActiveRoguelikeRun(playerAddress: Address | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
    functionName: "hasActiveRun",
    args: playerAddress ? [playerAddress] : undefined,
    query: { enabled: !!playerAddress },
  });
  return { ...result, data: result.data as boolean | undefined };
}

export function useIsRoguelikeNodeLocked(
  playerAddress: Address | undefined,
  nodeId: bigint | undefined,
) {
  const result = useReadContract({
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
    functionName: "isNodeLocked",
    args: playerAddress && nodeId != null ? [playerAddress, nodeId] : undefined,
    query: { enabled: !!playerAddress && nodeId != null },
  });
  return { ...result, data: result.data as boolean | undefined };
}

/** Batched lock-state check for a node's children (avoids a hook-per-child loop). */
export function useAreRoguelikeNodesLocked(
  playerAddress: Address | undefined,
  nodeIds: bigint[],
) {
  const result = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: ROGUELIKE_RUN_ADDRESS,
      abi: ROGUELIKE_RUN_ABI,
      chainId: CHAIN_ID,
      functionName: "isNodeLocked" as const,
      args: playerAddress ? ([playerAddress, id] as const) : undefined,
    })),
    query: { enabled: !!playerAddress && nodeIds.length > 0 },
  });

  const lockedByNodeId = new Map<string, boolean>();
  nodeIds.forEach((id, i) => {
    lockedByNodeId.set(id.toString(), (result.data?.[i]?.result as boolean | undefined) ?? true);
  });

  return { ...result, lockedByNodeId };
}

export function useIsRoguelikeNodeDefeated(
  playerAddress: Address | undefined,
  nodeId: bigint | undefined,
) {
  const result = useReadContract({
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
    functionName: "isNodeDefeated",
    args: playerAddress && nodeId != null ? [playerAddress, nodeId] : undefined,
    query: { enabled: !!playerAddress && nodeId != null },
  });
  return { ...result, data: result.data as boolean | undefined };
}

/** Batched defeated-state check for a node's children (avoids a hook-per-child loop) — gates re-entry via a twoWay back-edge into a Combat node already cleared earlier this run (NodeAlreadyDefeated otherwise). */
export function useAreRoguelikeNodesDefeated(
  playerAddress: Address | undefined,
  nodeIds: bigint[],
) {
  const result = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: ROGUELIKE_RUN_ADDRESS,
      abi: ROGUELIKE_RUN_ABI,
      chainId: CHAIN_ID,
      functionName: "isNodeDefeated" as const,
      args: playerAddress ? ([playerAddress, id] as const) : undefined,
    })),
    query: { enabled: !!playerAddress && nodeIds.length > 0 },
  });

  const defeatedByNodeId = new Map<string, boolean>();
  nodeIds.forEach((id, i) => {
    defeatedByNodeId.set(
      id.toString(),
      (result.data?.[i]?.result as boolean | undefined) ?? false,
    );
  });

  return { ...result, defeatedByNodeId };
}

/** Batched HP check for a roster (avoids a hook-per-ship loop). 0 means "not yet damaged this run" (fresh 100%), not literally 0 HP. */
export function useRoguelikeRosterHP(
  playerAddress: Address | undefined,
  shipIds: bigint[],
) {
  const result = useReadContracts({
    contracts: shipIds.map((id) => ({
      address: ROGUELIKE_RUN_ADDRESS,
      abi: ROGUELIKE_RUN_ABI,
      chainId: CHAIN_ID,
      functionName: "getShipHP" as const,
      args: playerAddress ? ([playerAddress, id] as const) : undefined,
    })),
    query: { enabled: !!playerAddress && shipIds.length > 0 },
  });

  const hpByShipId = new Map<string, number>();
  shipIds.forEach((id, i) => {
    hpByShipId.set(id.toString(), (result.data?.[i]?.result as number | undefined) ?? 0);
  });

  return { ...result, hpByShipId };
}

/** 0 means "not yet damaged this run" (fresh 100%), not literally 0 HP — see docs/update/Frontend_Update_Guide_Roguelike_Campaign.md §1. */
export function useRoguelikeShipHP(
  playerAddress: Address | undefined,
  shipId: bigint | undefined,
) {
  const result = useReadContract({
    address: ROGUELIKE_RUN_ADDRESS,
    abi: ROGUELIKE_RUN_ABI,
    chainId: CHAIN_ID,
    functionName: "getShipHP",
    args: playerAddress && shipId != null ? [playerAddress, shipId] : undefined,
    query: { enabled: !!playerAddress && shipId != null },
  });
  return { ...result, data: result.data as number | undefined };
}
