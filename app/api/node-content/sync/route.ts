/**
 * POST /api/node-content/sync
 *
 * Pulls the current on-chain NodeContentRegistry state for a set of node
 * ids and refreshes Postgres's bookkeeping of "what's on chain" for them —
 * the recovery/backstop half of the pull-edit-publish flow described in
 * NodeContentRegistry.sol's header comment. Content is authored in
 * Postgres (title/description, instant, no gas) and only reaches the chain
 * when an admin explicitly publishes (see /api/node-content/publish); this
 * endpoint reads the other direction, so Postgres can recover its
 * publishedTitle/publishedDescription bookkeeping (and, for nodes with no
 * in-progress edit, the live draft too) if it's ever out of sync with what
 * was actually last published on-chain.
 *
 * A row with a pending edit (dirtyAt != null) never has its draft
 * (title/description) overwritten here — only publishedTitle/
 * publishedDescription (the "last known on-chain value" bookkeeping) is
 * refreshed, so an admin's in-progress edit is never clobbered by a sync.
 * A node with nothing published on-chain yet (empty title from the
 * registry) is left alone entirely — an empty on-chain entry doesn't mean
 * "clear this content," it means "not published yet."
 *
 * The caller supplies nodeIds directly rather than this route re-deriving
 * "which nodes belong to campaign X" itself — the admin UI already has the
 * full node list for whichever campaign it's viewing (from
 * useCampaignGraphWithContent/useRoguelikeGraphWithContent), and campaign
 * membership is computed differently for CAMPAIGN (NodeMap.
 * getNodesInCampaign) vs ROGUELIKE (client-side filter over every node —
 * RoguelikeNodeMap has no per-campaign convenience read) — no reason to
 * duplicate either on the backend.
 *
 * Gated on requireNodeContentPublisher — either a web2 admin session, or a
 * wallet signature over buildNodeContentSyncSignMessage plus an on-chain
 * isNodeEditor check against NodeContentRegistry, so a wallet-only admin
 * (no Google session) can drive this too.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { prisma } from "@/app/lib/prisma";
import { requireNodeContentPublisher } from "@/app/lib/auth";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "@/app/config/contracts";

function parseGraphType(value: unknown): "CAMPAIGN" | "ROGUELIKE" | null {
  return value === "CAMPAIGN" || value === "ROGUELIKE" ? value : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { error } = await requireNodeContentPublisher(body, "sync");
  if (error) return error;

  const graphType = parseGraphType(body?.graphType);
  const nodeIds: unknown = body?.nodeIds;
  if (!graphType || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return NextResponse.json(
      { error: "graphType (CAMPAIGN|ROGUELIKE) and a non-empty nodeIds array are required" },
      { status: 400 },
    );
  }
  const parsedNodeIds = nodeIds.map(Number);
  if (parsedNodeIds.some((id) => !Number.isInteger(id))) {
    return NextResponse.json({ error: "nodeIds must all be integers" }, { status: 400 });
  }

  const isRoguelike = graphType === "ROGUELIKE";
  const registryAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
    .NODE_CONTENT_REGISTRY as `0x${string}`;
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

  const [onchainTitles, onchainDescriptions] = (await publicClient.readContract({
    address: registryAddress,
    abi: CONTRACT_ABIS.NODE_CONTENT_REGISTRY,
    functionName: "getNodeContentBatch",
    args: [parsedNodeIds.map(() => isRoguelike), parsedNodeIds.map((id) => BigInt(id))],
  })) as [string[], string[]];

  const existingRows = await prisma.nodeContent.findMany({
    where: { graphType, nodeId: { in: parsedNodeIds } },
  });
  const existingByNodeId = new Map(existingRows.map((row) => [row.nodeId, row]));

  let syncedCount = 0;
  let skippedDirtyCount = 0;

  for (let i = 0; i < parsedNodeIds.length; i++) {
    const nodeId = parsedNodeIds[i];
    const onchainTitle = onchainTitles[i];
    const onchainDescription = onchainDescriptions[i];
    if (!onchainTitle && !onchainDescription) continue; // nothing published yet — leave as-is

    const existing = existingByNodeId.get(nodeId);
    if (existing?.dirtyAt) {
      // Pending edit in progress — refresh only the "what's on chain"
      // bookkeeping, never the live draft.
      await prisma.nodeContent.update({
        where: { id: existing.id },
        data: { publishedTitle: onchainTitle, publishedDescription: onchainDescription },
      });
      skippedDirtyCount++;
      continue;
    }

    await prisma.nodeContent.upsert({
      where: { graphType_nodeId: { graphType, nodeId } },
      create: {
        graphType,
        nodeId,
        title: onchainTitle,
        description: onchainDescription,
        publishedTitle: onchainTitle,
        publishedDescription: onchainDescription,
      },
      update: {
        title: onchainTitle,
        description: onchainDescription,
        publishedTitle: onchainTitle,
        publishedDescription: onchainDescription,
      },
    });
    syncedCount++;
  }

  return NextResponse.json({ syncedCount, skippedDirtyCount });
}
