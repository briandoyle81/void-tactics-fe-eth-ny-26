"use client";

import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import {
  Archetype,
  MapPosition,
  ShipEquipment,
  AIEncountersTraits,
} from "../types/types";

const CHAIN_ID = baseSepolia.id;
const AI_ENCOUNTERS_ABI = CONTRACT_ABIS.AI_ENCOUNTERS as Abi;
const AI_ENCOUNTERS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .AI_ENCOUNTERS as `0x${string}`;

export function useAIEncountersAdmin() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const createAIShipConfig = useCallback(
    async (name: string, equipment: ShipEquipment, traits: AIEncountersTraits, archetype: Archetype) => {
      const hash = await writeContractAsync({
        address: AI_ENCOUNTERS_ADDRESS,
        abi: AI_ENCOUNTERS_ABI,
        functionName: "createAIShipConfig",
        args: [name, equipment, traits, archetype],
        chainId: CHAIN_ID,
      });
      console.log("[AIEncounters] createAIShipConfig tx:", hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const updateAIShipConfig = useCallback(
    async (
      configId: bigint,
      name: string,
      equipment: ShipEquipment,
      traits: AIEncountersTraits,
      archetype: Archetype,
    ) => {
      const hash = await writeContractAsync({
        address: AI_ENCOUNTERS_ADDRESS,
        abi: AI_ENCOUNTERS_ABI,
        functionName: "updateAIShipConfig",
        args: [configId, name, equipment, traits, archetype],
        chainId: CHAIN_ID,
      });
      console.log("[AIEncounters] updateAIShipConfig tx:", hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const setEncounterEditor = useCallback(
    async (editor: Address, allowed: boolean) => {
      const hash = await writeContractAsync({
        address: AI_ENCOUNTERS_ADDRESS,
        abi: AI_ENCOUNTERS_ABI,
        functionName: "setEncounterEditor",
        args: [editor, allowed],
        chainId: CHAIN_ID,
      });
      console.log("[AIEncounters] setEncounterEditor tx:", hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const setMapPlacement = useCallback(
    async (mapId: bigint, row: number, col: number, configId: bigint) => {
      const hash = await writeContractAsync({
        address: AI_ENCOUNTERS_ADDRESS,
        abi: AI_ENCOUNTERS_ABI,
        functionName: "setMapPlacement",
        args: [mapId, row, col, configId],
        chainId: CHAIN_ID,
      });
      console.log("[AIEncounters] setMapPlacement tx:", hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const setMapPlacements = useCallback(
    async (mapId: bigint, positions: MapPosition[], configIds: bigint[]) => {
      const hash = await writeContractAsync({
        address: AI_ENCOUNTERS_ADDRESS,
        abi: AI_ENCOUNTERS_ABI,
        functionName: "setMapPlacements",
        args: [mapId, positions, configIds],
        chainId: CHAIN_ID,
      });
      console.log("[AIEncounters] setMapPlacements tx:", hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  return {
    createAIShipConfig,
    updateAIShipConfig,
    setEncounterEditor,
    setMapPlacement,
    setMapPlacements,
  };
}
