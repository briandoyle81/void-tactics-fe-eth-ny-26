"use client";

import { useCallback } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

const CHAIN_ID = baseSepolia.id;
const ROGUELIKE_RESUPPLY_ABI = CONTRACT_ABIS.ROGUELIKE_RESUPPLY as Abi;
export const ROGUELIKE_RESUPPLY_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[
  CHAIN_ID
].ROGUELIKE_RESUPPLY as `0x${string}`;

export function useRoguelikeResupplyContract() {
  return {
    address: ROGUELIKE_RESUPPLY_ADDRESS,
    abi: ROGUELIKE_RESUPPLY_ABI,
    chainId: CHAIN_ID,
  };
}

/** Global admin-set rate: repair cost = missingHP * repairCostPerHP(), in UTC wei. Read live for a price preview before the player confirms. */
export function useRepairCostPerHP() {
  const result = useReadContract({
    address: ROGUELIKE_RESUPPLY_ADDRESS,
    abi: ROGUELIKE_RESUPPLY_ABI,
    chainId: CHAIN_ID,
    functionName: "repairCostPerHP",
  });
  return { ...result, data: result.data as bigint | undefined };
}

// resupplyRepair needs a UniversalCredits.approve step first — built as a
// TransactionButton approve-then-act pair directly in the resupply UI
// (same pattern as DroneStorefront.tsx/LobbyCreateButton.tsx), not wrapped
// here. resupplyModifyRoster needs no approval, so it's a plain write like
// useRoguelikeMatch's functions.
export function useRoguelikeResupply() {
  const { writeContractAsync } = useWriteContract();

  const resupplyModifyRoster = useCallback(
    (shipIdsToAdd: bigint[], shipIdsToRemove: bigint[]) =>
      writeContractAsync({
        address: ROGUELIKE_RESUPPLY_ADDRESS,
        abi: ROGUELIKE_RESUPPLY_ABI,
        functionName: "resupplyModifyRoster",
        args: [shipIdsToAdd, shipIdsToRemove],
        chainId: CHAIN_ID,
      }),
    [writeContractAsync],
  );

  return { resupplyModifyRoster };
}
