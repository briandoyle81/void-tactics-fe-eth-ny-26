"use client";

import { useAccount, useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

const CHAIN_ID = baseSepolia.id;
const AI_ENCOUNTERS_ABI = CONTRACT_ABIS.AI_ENCOUNTERS as Abi;
const AI_ENCOUNTERS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .AI_ENCOUNTERS as `0x${string}`;

// AIEncounters has its own on-chain, multi-address editor permission system
// (isEncounterEditor/setEncounterEditor) — separate from MAP_ADMIN_ADDRESS,
// which only gates map-geometry editing. Don't conflate the two.
export function useIsEncounterEditor() {
  const { address } = useAccount();

  const result = useReadContract({
    address: AI_ENCOUNTERS_ADDRESS,
    abi: AI_ENCOUNTERS_ABI,
    chainId: CHAIN_ID,
    functionName: "isEncounterEditor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return { isEditor: result.data === true, isLoading: result.isLoading };
}
