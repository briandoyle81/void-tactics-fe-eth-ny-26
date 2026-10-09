"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { STATIC_NODE_CONTENT } from "../config/content";

export type NodeGraphType = "CAMPAIGN" | "ROGUELIKE";

export interface NodeContentValue {
  title: string;
  description: string;
}

// Node title/description, keyed by node id in `contentById`. There is no
// fallback text: a node with nothing set shows an error in its place (see
// resolveNodeContent). Where `contentById` comes from depends on the mode:
// - web3: app/data/dialog/nodeContent.ts, shipped with the app and edited
//   by hand (not in the node editors). The contracts no longer store node
//   text.
// - web2: the NodeContent table (useNodeContentWeb2), edited through
//   PUT /api/node-content by a web2 admin.
// Read once per graph screen (not per node card) so node cards stay plain,
// sync components.

/** Web3 node text for the given nodes, from nodeContent.ts. No RPC. */
export function useWeb3NodeContent(
  graphType: NodeGraphType,
  nodeIds: readonly (bigint | number)[],
) {
  const contentById = useMemo(() => {
    const all = STATIC_NODE_CONTENT[graphType];
    const map = new Map<number, NodeContentValue>();
    nodeIds.forEach((id) => {
      const content = all[Number(id)];
      if (content && (content.title || content.description)) map.set(Number(id), content);
    });
    return map;
  }, [graphType, nodeIds]);
  return { contentById, isLoading: false, refetch: async () => undefined };
}

interface NodeContentRow {
  graphType: NodeGraphType;
  nodeId: number;
  title: string;
  description: string;
}

const WEB2_QUERY_KEY = (graphType: NodeGraphType) => ["node-content", graphType];

/** Web2 node text from the NodeContent table. */
export function useNodeContentWeb2(graphType: NodeGraphType, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: WEB2_QUERY_KEY(graphType),
    queryFn: () => apiFetch<NodeContentRow[]>(`/api/node-content?graphType=${graphType}`),
    enabled,
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

/** Saves web2 node text (web2 admin session required). */
export function useSaveNodeContentWeb2() {
  const queryClient = useQueryClient();
  return useCallback(
    async (graphType: NodeGraphType, nodeId: number, content: NodeContentValue) => {
      await apiMutate<NodeContentRow>("/api/node-content", "PUT", {
        graphType,
        nodeId,
        title: content.title,
        description: content.description,
      });
      await queryClient.invalidateQueries({ queryKey: WEB2_QUERY_KEY(graphType) });
    },
    [queryClient],
  );
}

export type NodeContentStatus = "ok" | "loading" | "missing";

/** A node's title/description as displayed, with each field's status. */
export interface ResolvedNodeContent extends NodeContentValue {
  titleStatus: NodeContentStatus;
  descriptionStatus: NodeContentStatus;
}

const NODE_CONTENT_LOADING_TEXT = "Loading…";

/**
 * Title/description for a node, with no fallback text: a field that hasn't
 * been set shows an error in its place, and while the content read is still
 * in flight both fields show a loading placeholder instead, so errors don't
 * flash on first load.
 */
export function resolveNodeContent(
  contentById: Map<number, NodeContentValue>,
  nodeId: bigint | number,
  isLoading = false,
): ResolvedNodeContent {
  const id = Number(nodeId);
  const content = contentById.get(id);
  if (!content && isLoading) {
    return {
      title: NODE_CONTENT_LOADING_TEXT,
      description: NODE_CONTENT_LOADING_TEXT,
      titleStatus: "loading",
      descriptionStatus: "loading",
    };
  }
  const title = content?.title.trim() ? content.title : null;
  const description = content?.description.trim() ? content.description : null;
  return {
    title: title ?? `Error: node #${id} has no title`,
    description: description ?? `Error: node #${id} has no description`,
    titleStatus: title ? "ok" : "missing",
    descriptionStatus: description ? "ok" : "missing",
  };
}

/** Editor field values: only real content, never the loading/error placeholder. */
export function editableTitle(node: Partial<ResolvedNodeContent> | null | undefined): string {
  return node?.titleStatus === "ok" ? (node.title ?? "") : "";
}
export function editableDescription(node: Partial<ResolvedNodeContent> | null | undefined): string {
  return node?.descriptionStatus === "ok" ? (node.description ?? "") : "";
}

/** Text class for a node title/description: warning color when missing, muted while loading. */
export function nodeContentTextClass(status: NodeContentStatus | undefined, okClass: string): string {
  if (status === "missing") return "text-warning-red";
  if (status === "loading") return "text-text-muted";
  return okClass;
}

// Attaches resolveNodeContent's title/description onto each node in one
// pass, so callers building a full graph (structure + content) can read
// `.title`/`.description` straight off each node instead of calling
// resolveNodeContent separately per node and again for whichever node is
// selected. Generic over both bigint ids (on-chain CampaignGraphNode/
// RoguelikeNode) and number ids (web2's DB-native node shapes).
export function mergeNodeContent<T extends { id: bigint | number }>(
  nodes: T[],
  contentById: Map<number, NodeContentValue>,
  isLoading = false,
): (T & ResolvedNodeContent)[] {
  return nodes.map((node) => ({
    ...node,
    ...resolveNodeContent(contentById, node.id, isLoading),
  }));
}
