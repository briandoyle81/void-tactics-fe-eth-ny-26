"use client";

import { useCallback, useState } from "react";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import lotteryHookDeploy from "../contracts/base-sepolia/uniswap-lottery-hook.json";
import { useSelectedChainId } from "./useSelectedChainId";

// Base Sepolia only — this Uniswap v4 hook's address is constrained by its
// permission-flag bits (mined, not an Ignition-module deploy), so it ships
// in its own combined address+ABI file rather than deployed_addresses.json.
const LOTTERY_HOOK_ADDRESS = lotteryHookDeploy.address as `0x${string}`;
const LOTTERY_HOOK_ABI = lotteryHookDeploy.abi as Abi;

const RECENT_EVENTS_LIMIT = 10;

export interface LotterySellEntry {
  drawId: bigint;
  ethProceeds: bigint;
  playerWeightInDraw: bigint;
  blockNumber: bigint | null;
}

export interface LotteryDrawResultEntry {
  drawId: bigint;
  winner?: Address;
  noWinner: boolean;
  blockNumber: bigint | null;
}

/**
 * UTCLotteryHook (docs/update/Frontend_Updates_2026-09-17.md §4): entry
 * weight into a draw is capped per address, and a resolved draw does not
 * always have a winner. Qualifying entries come from selling UTC on the
 * hooked Uniswap v4 pool directly (not from an action in this app) — this
 * hook only surfaces live status/results, it never initiates a swap.
 */
export function useUtcLotteryHook() {
  const activeChainId = useSelectedChainId();
  const { address: userAddress } = useAccount();
  const isDeployed =
    activeChainId === baseSepolia.id &&
    !!LOTTERY_HOOK_ADDRESS &&
    LOTTERY_HOOK_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const baseConfig = {
    address: LOTTERY_HOOK_ADDRESS,
    abi: LOTTERY_HOOK_ABI,
    chainId: baseSepolia.id,
  } as const;

  // Owner-configurable — always read live, never hardcode the documented
  // defaults (1 ether / 10 / etc).
  const { data: maxWeightPerEntryWei } = useReadContract({
    ...baseConfig,
    functionName: "maxWeightPerEntryWei",
    query: { enabled: isDeployed },
  });
  const { data: maxWinProbabilityDenominator } = useReadContract({
    ...baseConfig,
    functionName: "maxWinProbabilityDenominator",
    query: { enabled: isDeployed },
  });
  const { data: minEntryThresholdWei } = useReadContract({
    ...baseConfig,
    functionName: "minEntryThresholdWei",
    query: { enabled: isDeployed },
  });
  const { data: minParticipants } = useReadContract({
    ...baseConfig,
    functionName: "minParticipants",
    query: { enabled: isDeployed },
  });
  const { data: minTotalWeightWei } = useReadContract({
    ...baseConfig,
    functionName: "minTotalWeightWei",
    query: { enabled: isDeployed },
  });
  const { data: drawInterval } = useReadContract({
    ...baseConfig,
    functionName: "drawInterval",
    query: { enabled: isDeployed },
  });
  const { data: lastDrawTime, refetch: refetchLastDrawTime } = useReadContract({
    ...baseConfig,
    functionName: "lastDrawTime",
    query: { enabled: isDeployed },
  });

  const { data: currentDrawIdData, refetch: refetchCurrentDrawId } = useReadContract({
    ...baseConfig,
    functionName: "currentDrawId",
    query: { enabled: isDeployed },
  });
  const currentDrawId = currentDrawIdData as bigint | undefined;

  const { data: totalWeightInDraw, refetch: refetchTotalWeight } = useReadContract({
    ...baseConfig,
    functionName: "totalWeightInDraw",
    args: currentDrawId != null ? [currentDrawId] : undefined,
    query: { enabled: isDeployed && currentDrawId != null },
  });

  const { data: yourWeightInDraw, refetch: refetchYourWeight } = useReadContract({
    ...baseConfig,
    functionName: "weightInDraw",
    args: currentDrawId != null && userAddress ? [currentDrawId, userAddress] : undefined,
    query: { enabled: isDeployed && currentDrawId != null && !!userAddress },
  });

  const { data: hasParticipated, refetch: refetchHasParticipated } = useReadContract({
    ...baseConfig,
    functionName: "hasParticipated",
    args: currentDrawId != null && userAddress ? [currentDrawId, userAddress] : undefined,
    query: { enabled: isDeployed && currentDrawId != null && !!userAddress },
  });

  const { data: isDrawResolved, refetch: refetchIsDrawResolved } = useReadContract({
    ...baseConfig,
    functionName: "drawResolved",
    args: currentDrawId != null ? [currentDrawId] : undefined,
    query: { enabled: isDeployed && currentDrawId != null },
  });

  const refetchDrawState = useCallback(() => {
    void refetchCurrentDrawId();
    void refetchTotalWeight();
    void refetchYourWeight();
    void refetchHasParticipated();
    void refetchIsDrawResolved();
    void refetchLastDrawTime();
  }, [
    refetchCurrentDrawId,
    refetchTotalWeight,
    refetchYourWeight,
    refetchHasParticipated,
    refetchIsDrawResolved,
    refetchLastDrawTime,
  ]);

  // Recent event feed — live only (from the moment this hook mounts), not a
  // backfilled history. Bounded so it can't grow unbounded across a long
  // session.
  const [recentSells, setRecentSells] = useState<LotterySellEntry[]>([]);
  const [recentDrawResults, setRecentDrawResults] = useState<LotteryDrawResultEntry[]>([]);

  useWatchContractEvent({
    ...baseConfig,
    eventName: "SellRecorded",
    enabled: isDeployed && !!userAddress,
    onLogs: (logs) => {
      const mine = logs.filter(
        (log) =>
          (log as unknown as { args?: { player?: Address } }).args?.player?.toLowerCase() ===
          userAddress?.toLowerCase(),
      );
      if (mine.length === 0) return;
      setRecentSells((prev) => {
        const additions: LotterySellEntry[] = mine.map((log) => {
          const args = (
            log as unknown as {
              args?: { drawId?: bigint; ethProceeds?: bigint; playerWeightInDraw?: bigint };
            }
          ).args;
          return {
            drawId: args?.drawId ?? 0n,
            ethProceeds: args?.ethProceeds ?? 0n,
            playerWeightInDraw: args?.playerWeightInDraw ?? 0n,
            blockNumber: log.blockNumber,
          };
        });
        return [...additions, ...prev].slice(0, RECENT_EVENTS_LIMIT);
      });
      refetchDrawState();
    },
  });

  useWatchContractEvent({
    ...baseConfig,
    eventName: "DrawResolved",
    enabled: isDeployed,
    onLogs: (logs) => {
      setRecentDrawResults((prev) => {
        const additions: LotteryDrawResultEntry[] = logs.map((log) => {
          const args = (log as unknown as { args?: { drawId?: bigint; winner?: Address } }).args;
          return {
            drawId: args?.drawId ?? 0n,
            winner: args?.winner,
            noWinner: false,
            blockNumber: log.blockNumber,
          };
        });
        return [...additions, ...prev].slice(0, RECENT_EVENTS_LIMIT);
      });
      refetchDrawState();
    },
  });

  useWatchContractEvent({
    ...baseConfig,
    eventName: "DrawResolvedNoWinner",
    enabled: isDeployed,
    onLogs: (logs) => {
      setRecentDrawResults((prev) => {
        const additions: LotteryDrawResultEntry[] = logs.map((log) => {
          const args = (log as unknown as { args?: { drawId?: bigint } }).args;
          return { drawId: args?.drawId ?? 0n, noWinner: true, blockNumber: log.blockNumber };
        });
        return [...additions, ...prev].slice(0, RECENT_EVENTS_LIMIT);
      });
      refetchDrawState();
    },
  });

  useWatchContractEvent({
    ...baseConfig,
    eventName: "DrawStarted",
    enabled: isDeployed,
    onLogs: () => refetchDrawState(),
  });

  return {
    isDeployed,
    lotteryHookAddress: LOTTERY_HOOK_ADDRESS,
    maxWeightPerEntryWei: maxWeightPerEntryWei as bigint | undefined,
    maxWinProbabilityDenominator: maxWinProbabilityDenominator as bigint | undefined,
    minEntryThresholdWei: minEntryThresholdWei as bigint | undefined,
    minParticipants: minParticipants as bigint | undefined,
    minTotalWeightWei: minTotalWeightWei as bigint | undefined,
    drawInterval: drawInterval as bigint | undefined,
    lastDrawTime: lastDrawTime as bigint | undefined,
    currentDrawId,
    totalWeightInDraw: totalWeightInDraw as bigint | undefined,
    yourWeightInDraw: yourWeightInDraw as bigint | undefined,
    hasParticipated: hasParticipated as boolean | undefined,
    isDrawResolved: isDrawResolved as boolean | undefined,
    recentSells,
    recentDrawResults,
    refetchDrawState,
  };
}
