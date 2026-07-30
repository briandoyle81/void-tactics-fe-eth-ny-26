"use client";

import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { useNodeMapContract } from "./useNodeMap";

export function useNodeMapAdmin() {
  const { writeContractAsync } = useWriteContract();
  const contract = useNodeMapContract();
  const publicClient = usePublicClient({ chainId: contract.chainId });

  const createNode = useCallback(
    async (
      campaignId: bigint,
      mapId: bigint,
      prerequisites: bigint[],
      costLimit: bigint,
      turnTime: bigint,
      maxScore: bigint,
      creatorGoesFirst: boolean,
      enemyThreat: bigint,
    ) => {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "createNode",
        args: [
          campaignId,
          mapId,
          prerequisites,
          costLimit,
          turnTime,
          maxScore,
          creatorGoesFirst,
          enemyThreat,
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, contract, publicClient],
  );

  const updateNode = useCallback(
    async (
      nodeId: bigint,
      campaignId: bigint,
      mapId: bigint,
      prerequisites: bigint[],
      costLimit: bigint,
      turnTime: bigint,
      maxScore: bigint,
      creatorGoesFirst: boolean,
      enemyThreat: bigint,
    ) => {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "updateNode",
        args: [
          nodeId,
          campaignId,
          mapId,
          prerequisites,
          costLimit,
          turnTime,
          maxScore,
          creatorGoesFirst,
          enemyThreat,
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, contract, publicClient],
  );

  const setNodeEditor = useCallback(
    async (editor: Address, allowed: boolean) => {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "setNodeEditor",
        args: [editor, allowed],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, contract, publicClient],
  );

  return {
    createNode,
    updateNode,
    setNodeEditor,
  };
}
