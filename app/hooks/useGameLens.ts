"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import type { RoguelikeNode, RoguelikeRun } from "../types/roguelike";
import { ADMIN_DATA_STALE_MS } from "../config/queryTiming";

// GameLens: read-only aggregate views (2026-10-08 redeploy), so a screen
// gets in one eth_call what used to take several dependent requests. See
// docs/redesign-10-7/frontend-handoff-rpc-cost-suggestions-2026-10-08.md §3.

const CHAIN_ID = baseSepolia.id;
export const GAME_LENS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID].GAME_LENS as Address;
const GAME_LENS_ABI = CONTRACT_ABIS.GAME_LENS as Abi;

interface RunViewRaw {
  run: RoguelikeRun;
  rosterHP: readonly number[];
  nodeIds: readonly bigint[];
  nodeLocked: readonly boolean[];
  nodeDefeated: readonly boolean[];
}

/**
 * The player's run, each roster ship's persisted HP (0 = not yet damaged,
 * i.e. full), and the locked/defeated flag for every node reachable in its
 * campaign — replacing getRun + getShipHP×N + isNodeLocked×N +
 * isNodeDefeated×N. Maps are keyed by id string, matching the batched
 * hooks they replace.
 */
export function useRoguelikeRunView(player: Address | undefined, enabled = true) {
  const result = useReadContract({
    address: GAME_LENS_ADDRESS,
    abi: GAME_LENS_ABI,
    chainId: CHAIN_ID,
    functionName: "getRunView",
    args: player ? [player] : undefined,
    query: { enabled: enabled && !!player },
  });
  const raw = result.data as RunViewRaw | undefined;
  const view = useMemo(() => {
    const hpByShipId = new Map<string, number>();
    const lockedByNodeId = new Map<string, boolean>();
    const defeatedByNodeId = new Map<string, boolean>();
    if (raw) {
      raw.run.rosterShipIds.forEach((id, i) => hpByShipId.set(id.toString(), Number(raw.rosterHP[i] ?? 0)));
      raw.nodeIds.forEach((id, i) => {
        lockedByNodeId.set(id.toString(), Boolean(raw.nodeLocked[i]));
        defeatedByNodeId.set(id.toString(), Boolean(raw.nodeDefeated[i]));
      });
    }
    return { run: raw?.run, hpByShipId, lockedByNodeId, defeatedByNodeId };
  }, [raw]);
  return { ...view, isLoading: result.isLoading, refetch: result.refetch };
}

/**
 * Every node reachable from the campaign's root (breadth-first), children
 * included — replacing nodeCount + getNode×N. Unlinked nodes aren't
 * returned, so the map editor keeps the full scan (useAllRoguelikeNodes).
 */
export function useRoguelikeCampaignGraph(campaignId: bigint, enabled = true) {
  const result = useReadContract({
    address: GAME_LENS_ADDRESS,
    abi: GAME_LENS_ABI,
    chainId: CHAIN_ID,
    functionName: "getCampaignGraph",
    args: [campaignId],
    query: { enabled, staleTime: ADMIN_DATA_STALE_MS },
  });
  const nodes = useMemo(
    () => ((result.data as readonly RoguelikeNode[] | undefined) ?? []).filter((n) => n.exists),
    [result.data],
  );
  return { ...result, nodes };
}
