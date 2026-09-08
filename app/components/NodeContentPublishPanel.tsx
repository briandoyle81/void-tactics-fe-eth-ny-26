"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { toast } from "react-hot-toast";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { NodeGraphType } from "../hooks/useNodeContent";
import {
  buildNodeContentSyncSignMessage,
  buildNodeContentPublishSignMessage,
  computeNodeContentBatchHash,
} from "../utils/nodeContentSignMessage";

interface NodeContentRow {
  nodeId: number;
  title: string;
  description: string;
  dirtyAt: string | null;
}

interface NodeContentPublishPanelProps {
  graphType: NodeGraphType;
  /** Every node id in the campaign currently being viewed — scopes both
   * "Sync from chain" and "Publish" to just this campaign, since
   * NodeContent has no campaignId column of its own (see sync/route.ts's
   * doc-comment on why the caller supplies ids rather than the API
   * re-deriving campaign membership). */
  nodeIds: number[];
}

// Admin surface for the on-chain NodeContentRegistry publish flow (see
// contracts/NodeContentRegistry.sol and app/api/node-content/{sync,publish}/
// route.ts). Works from either admin surface: a web2 (Google) admin session
// needs no signature at all, and a wallet-only editor (holding isNodeEditor
// on NodeContentRegistry, no Google session) signs buildNodeContent{Sync,
// Publish}SignMessage with the connected wallet, mirroring how
// useSaveNodeContent (useNodeContent.ts) already signs single-node PUT
// saves for the same wallet-only-admin case — see requireNodeContentPublisher
// (app/lib/auth.ts) for how the server verifies either path.
export function NodeContentPublishPanel({ graphType, nodeIds }: NodeContentPublishPanelProps) {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  const queryKey = ["node-content", graphType];
  const { data: rows } = useQuery({
    queryKey,
    queryFn: () => apiFetch<NodeContentRow[]>(`/api/node-content?graphType=${graphType}`),
  });

  const nodeIdSet = React.useMemo(() => new Set(nodeIds), [nodeIds]);
  const dirtyRowsInScope = React.useMemo(
    () => (rows ?? []).filter((row) => nodeIdSet.has(row.nodeId) && row.dirtyAt != null),
    [rows, nodeIdSet],
  );
  const pendingCount = dirtyRowsInScope.length;

  // Always attempts a signature when a wallet is connected, regardless of
  // whether a web2 session might also cover the request — same
  // belt-and-suspenders approach useSaveNodeContent already takes; the
  // server tries the web2 session first and only falls back to verifying
  // this signature if there isn't one.
  const maybeSign = async (message: string) => {
    if (!address) return {};
    const signature = await signMessageAsync({ message });
    return { address, signature };
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const signaturePayload = await maybeSign(buildNodeContentSyncSignMessage({ graphType, nodeIds }));
      const result = await apiMutate<{ syncedCount: number; skippedDirtyCount: number }>(
        "/api/node-content/sync",
        "POST",
        { graphType, nodeIds, ...signaturePayload },
      );
      await queryClient.invalidateQueries({ queryKey });
      toast.success(
        `Synced ${result.syncedCount} node(s) from chain` +
          (result.skippedDirtyCount > 0
            ? ` (${result.skippedDirtyCount} skipped — pending edits).`
            : "."),
      );
    } catch (error) {
      console.error("Failed to sync node content from chain:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync from chain");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const contentHash = computeNodeContentBatchHash(dirtyRowsInScope);
      const signaturePayload = await maybeSign(
        buildNodeContentPublishSignMessage({ graphType, nodeIds, contentHash }),
      );
      const result = await apiMutate<{ publishedCount: number; chunkCount: number; error?: string }>(
        "/api/node-content/publish",
        "POST",
        { graphType, nodeIds, contentHash, ...signaturePayload },
      );
      await queryClient.invalidateQueries({ queryKey });
      if (result.error) {
        toast.error(`Published ${result.publishedCount} node(s), then stopped: ${result.error}`);
      } else {
        toast.success(`Published ${result.publishedCount} node(s) to chain.`);
      }
    } catch (error) {
      console.error("Failed to publish node content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to publish node content");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-text-muted">
        On-chain content publish — {pendingCount} node{pendingCount === 1 ? "" : "s"} with
        unpublished edits
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSyncing}
          onClick={() => void handleSync()}
          className="flex-1 px-4 py-2 border-2 border-cyan text-cyan text-xs font-bold uppercase tracking-wider hover:bg-cyan/10 disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isSyncing ? "[SYNCING...]" : "[SYNC FROM CHAIN]"}
        </button>
        <button
          type="button"
          disabled={isPublishing || pendingCount === 0}
          onClick={() => void handlePublish()}
          className="flex-1 px-4 py-2 border-2 border-phosphor-green text-phosphor-green text-xs font-bold uppercase tracking-wider hover:bg-phosphor-green/10 disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isPublishing ? "[PUBLISHING...]" : `[PUBLISH (${pendingCount})]`}
        </button>
      </div>
    </div>
  );
}
