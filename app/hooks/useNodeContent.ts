"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { getNodeContent } from "../config/campaignNodes";
import { getRoguelikeNodeContent } from "../config/roguelikeNodes";
import { buildNodeContentSignMessage } from "../utils/nodeContentSignMessage";

export type NodeGraphType = "CAMPAIGN" | "ROGUELIKE";

export interface NodeContentValue {
  title: string;
  description: string;
}

interface NodeContentRow {
  graphType: NodeGraphType;
  nodeId: number;
  title: string;
  description: string;
}

const QUERY_KEY = (graphType: NodeGraphType) => ["node-content", graphType];

// Admin-editable overlay for node title/description, layered on top of the
// hand-maintained campaignNodes.ts/roguelikeNodes.ts static fallback files —
// a DB row wins if present for a given node id, otherwise the static file's
// placeholder entry is used, otherwise DEFAULT_*_NODE_CONTENT. Fetched once
// per graph screen (not per node card) so CampaignNodeCard/RoguelikeNodeCard
// stay plain, sync, data-fetching-free components — callers merge this map
// into their own canvasNodes entries before handing off to
// CampaignGraphCanvas, the same way they already resolve unlocked/completed.
export function useAllNodeContent(graphType: NodeGraphType) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY(graphType),
    queryFn: () => apiFetch<NodeContentRow[]>(`/api/node-content?graphType=${graphType}`),
  });

  const contentById = useMemo(() => {
    const map = new Map<number, NodeContentValue>();
    (data ?? []).forEach((row) => {
      map.set(row.nodeId, { title: row.title, description: row.description });
    });
    return map;
  }, [data]);

  return { contentById, isLoading, refetch };
}

// Web3-connected admins have no NextAuth session (see requireWeb2Admin), so a
// pure PUT with no credentials 403s them even though they hold a real
// on-chain isNodeEditor/isRoguelikeNodeEditor role. When a wallet is
// connected, sign buildNodeContentSignMessage(...) and send {address,
// signature} so the server (requireNodeContentEditor in app/lib/auth.ts) can
// recover the signer and check their on-chain editor role instead. Web2
// admins with no wallet connected just omit these and rely on their session.
export function useSaveNodeContent() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return async (graphType: NodeGraphType, nodeId: number, content: NodeContentValue) => {
    let signaturePayload: { address: string; signature: string } | Record<string, never> = {};
    if (address) {
      const message = buildNodeContentSignMessage({
        graphType,
        nodeId,
        title: content.title,
        description: content.description,
      });
      const signature = await signMessageAsync({ message });
      signaturePayload = { address, signature };
    }

    await apiMutate<NodeContentRow>("/api/node-content", "PUT", {
      graphType,
      nodeId,
      title: content.title,
      description: content.description,
      ...signaturePayload,
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY(graphType) });
  };
}

// contentById comes from useAllNodeContent for the same graphType; falls
// back to the relevant static file, then a generic default, so a node
// always has something to render even before any DB row exists for it.
export function resolveNodeContent(
  graphType: NodeGraphType,
  contentById: Map<number, NodeContentValue>,
  nodeId: bigint | number,
): NodeContentValue {
  const dbContent = contentById.get(Number(nodeId));
  if (dbContent) return dbContent;
  return graphType === "CAMPAIGN" ? getNodeContent(nodeId) : getRoguelikeNodeContent(nodeId);
}

// Attaches resolveNodeContent's title/description onto each node in one
// pass, so callers building a full graph (structure + content) can read
// `.title`/`.description` straight off each node instead of calling
// resolveNodeContent separately per node and again for whichever node is
// selected. Generic over both bigint ids (on-chain CampaignGraphNode/
// RoguelikeNode) and number ids (web2's DB-native node shapes).
export function mergeNodeContent<T extends { id: bigint | number }>(
  graphType: NodeGraphType,
  nodes: T[],
  contentById: Map<number, NodeContentValue>,
): (T & NodeContentValue)[] {
  return nodes.map((node) => ({
    ...node,
    ...resolveNodeContent(graphType, contentById, node.id),
  }));
}
