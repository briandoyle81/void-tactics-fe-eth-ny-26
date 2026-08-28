"use client";

import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { useRoguelikeNodeMapContract } from "./useRoguelikeNodeMap";
import { useRoguelikeResupplyContract } from "./useRoguelikeResupply";
import { RoguelikeNodeKind } from "../types/roguelike";

export function useRoguelikeNodeMapAdmin() {
  const { writeContractAsync } = useWriteContract();
  const nodeMapContract = useRoguelikeNodeMapContract();
  const resupplyContract = useRoguelikeResupplyContract();
  const publicClient = usePublicClient({ chainId: nodeMapContract.chainId });

  const createCampaign = useCallback(async () => {
    const hash = await writeContractAsync({
      ...nodeMapContract,
      functionName: "createCampaign",
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  }, [writeContractAsync, nodeMapContract, publicClient]);

  const setCampaignRoot = useCallback(
    async (campaignId: bigint, nodeId: bigint) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "setCampaignRoot",
        args: [campaignId, nodeId],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const setCampaignAutoHealPercent = useCallback(
    async (campaignId: bigint, percent: number) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "setCampaignAutoHealPercent",
        args: [campaignId, percent],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const setCampaignRequiredVariant = useCallback(
    async (campaignId: bigint, variant: number) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "setCampaignRequiredVariant",
        args: [campaignId, variant],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const setCampaignInitialCostCap = useCallback(
    async (campaignId: bigint, costCap: bigint) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "setCampaignInitialCostCap",
        args: [campaignId, costCap],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const createNode = useCallback(
    async (
      campaignId: bigint,
      kind: RoguelikeNodeKind,
      mapId: bigint,
      turnTime: bigint,
      maxScore: bigint,
      creatorGoesFirst: boolean,
      costCapOverride: bigint,
    ) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "createNode",
        args: [
          campaignId,
          kind,
          mapId,
          turnTime,
          maxScore,
          creatorGoesFirst,
          costCapOverride,
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const updateNode = useCallback(
    async (
      nodeId: bigint,
      campaignId: bigint,
      kind: RoguelikeNodeKind,
      mapId: bigint,
      turnTime: bigint,
      maxScore: bigint,
      creatorGoesFirst: boolean,
      costCapOverride: bigint,
    ) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "updateNode",
        args: [
          nodeId,
          campaignId,
          kind,
          mapId,
          turnTime,
          maxScore,
          creatorGoesFirst,
          costCapOverride,
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const addChild = useCallback(
    async (parentId: bigint, childId: bigint, twoWay: boolean) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "addChild",
        args: [parentId, childId, twoWay],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const removeChild = useCallback(
    async (parentId: bigint, childId: bigint) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "removeChild",
        args: [parentId, childId],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const setNodeEditor = useCallback(
    async (editor: Address, allowed: boolean) => {
      const hash = await writeContractAsync({
        ...nodeMapContract,
        functionName: "setNodeEditor",
        args: [editor, allowed],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, nodeMapContract, publicClient],
  );

  const setRepairCostPerHP = useCallback(
    async (cost: bigint) => {
      const hash = await writeContractAsync({
        ...resupplyContract,
        functionName: "setRepairCostPerHP",
        args: [cost],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, resupplyContract, publicClient],
  );

  const withdrawResupplyFees = useCallback(
    async (to: Address) => {
      const hash = await writeContractAsync({
        ...resupplyContract,
        functionName: "withdraw",
        args: [to],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, resupplyContract, publicClient],
  );

  return {
    createCampaign,
    setCampaignRoot,
    setCampaignAutoHealPercent,
    setCampaignRequiredVariant,
    setCampaignInitialCostCap,
    createNode,
    updateNode,
    addChild,
    removeChild,
    setNodeEditor,
    setRepairCostPerHP,
    withdrawResupplyFees,
  };
}
