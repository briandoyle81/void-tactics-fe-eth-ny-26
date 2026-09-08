"use client";

import { useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

// Pluggable win effects (see contracts/IWinEffect.sol) — one singleton
// instance of each concrete effect exists per deploy
// (DECBonusWinEffect/HealAboveFloorWinEffect/ShipGrantWinEffect), each with
// its own global config, and each caller (RoguelikeNodeMap per-node,
// PvPMatch, Tournament) assigns an ordered subset of these addresses via
// its own setWinEffects/setNodeWinEffects. This catalog is the FE's map
// from "known effect contract" to a human label + which chain key to
// resolve its address from — adding a future effect kind means deploying
// its contract, adding one entry here, and wiring its own config UI, not
// touching any of the three callers or this file's shape.
const CHAIN_ID = baseSepolia.id;

export const WIN_EFFECT_CATALOG = [
  { key: "DEC_BONUS_WIN_EFFECT", label: "DEC Bonus" },
  { key: "HEAL_ABOVE_FLOOR_WIN_EFFECT", label: "Heal Above Floor" },
  { key: "SHIP_GRANT_WIN_EFFECT", label: "Grant Ship" },
] as const;

export function useWinEffectAddresses(): Record<string, Address> {
  const addresses = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID];
  return Object.fromEntries(
    WIN_EFFECT_CATALOG.map(({ key }) => [key, addresses[key] as Address]),
  );
}

export function useRoguelikeNodeWinEffects(nodeId: bigint | undefined) {
  const nodeMapAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
    .ROGUELIKE_NODE_MAP as Address;
  const result = useReadContract({
    address: nodeMapAddress,
    abi: CONTRACT_ABIS.ROGUELIKE_NODE_MAP as Abi,
    chainId: CHAIN_ID,
    functionName: "getNodeWinEffects",
    args: nodeId != null ? [nodeId] : undefined,
    query: { enabled: nodeId != null },
  });
  return { ...result, data: result.data as Address[] | undefined };
}

export function usePvPMatchWinEffects() {
  const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID].PVP_MATCH as Address;
  const result = useReadContract({
    address,
    abi: CONTRACT_ABIS.PVP_MATCH as Abi,
    chainId: CHAIN_ID,
    functionName: "getWinEffects",
  });
  return { ...result, data: result.data as Address[] | undefined };
}

export function useTournamentWinEffects() {
  const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID].TOURNAMENT as Address;
  const result = useReadContract({
    address,
    abi: CONTRACT_ABIS.TOURNAMENT as Abi,
    chainId: CHAIN_ID,
    functionName: "getWinEffects",
  });
  return { ...result, data: result.data as Address[] | undefined };
}

export function useDECBonusAmount() {
  const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
    .DEC_BONUS_WIN_EFFECT as Address;
  const result = useReadContract({
    address,
    abi: CONTRACT_ABIS.DEC_BONUS_WIN_EFFECT as Abi,
    chainId: CHAIN_ID,
    functionName: "bonusAmount",
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useHealAboveFloorPercent() {
  const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
    .HEAL_ABOVE_FLOOR_WIN_EFFECT as Address;
  const result = useReadContract({
    address,
    abi: CONTRACT_ABIS.HEAL_ABOVE_FLOOR_WIN_EFFECT as Abi,
    chainId: CHAIN_ID,
    functionName: "healToPercent",
  });
  return { ...result, data: result.data as number | undefined };
}

export function useShipGrantConfig() {
  const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
    .SHIP_GRANT_WIN_EFFECT as Address;
  const variantResult = useReadContract({
    address,
    abi: CONTRACT_ABIS.SHIP_GRANT_WIN_EFFECT as Abi,
    chainId: CHAIN_ID,
    functionName: "shipVariant",
  });
  const tierResult = useReadContract({
    address,
    abi: CONTRACT_ABIS.SHIP_GRANT_WIN_EFFECT as Abi,
    chainId: CHAIN_ID,
    functionName: "shipTier",
  });
  return {
    variant: variantResult.data as number | undefined,
    tier: tierResult.data as number | undefined,
    isLoading: variantResult.isLoading || tierResult.isLoading,
    refetch: () => {
      void variantResult.refetch();
      void tierResult.refetch();
    },
  };
}
