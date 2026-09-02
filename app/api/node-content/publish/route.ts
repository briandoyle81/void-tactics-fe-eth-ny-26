/**
 * POST /api/node-content/publish
 *
 * Writes every dirty (unpublished-edit) NodeContent row among the supplied
 * nodeIds to the on-chain NodeContentRegistry, in chunks, signed by a
 * dedicated backend wallet — the "publish" half of the pull-edit-publish
 * flow (see NodeContentRegistry.sol's header comment and
 * /api/node-content/sync/route.ts's matching doc-comment for "pull").
 *
 * Signs server-side via NODE_CONTENT_PUBLISHER_PRIVATE_KEY rather than the
 * connected browser wallet, reusing the same backend-signer pattern
 * app/api/flow/fulfill/route.ts already uses for gasless minting
 * (privateKeyToAccount -> createWalletClient -> writeContract). Publishing
 * a full ~100-node campaign as up to ~100 individually-signed wallet
 * transactions isn't a workable admin flow — batching (setNodeContentBatch)
 * plus a single backend signer means one button click, not N wallet popups.
 * That wallet's address must separately be granted isNodeEditor on
 * NodeContentRegistry (via setNodeEditor, owner-only) before this route can
 * succeed — see DeployAndConfig.ts's AllowNodeContentEditor call, which
 * today only grants MAP_EDITOR; the publisher key's address needs its own
 * grant once provisioned.
 *
 * CHUNK_SIZE=20 is picked from NodeContentRegistry.test.ts's "Gas sizing"
 * benchmark (~373k gas/entry for realistically-sized title+description
 * content -> ~7.47M gas for a 20-entry batch), leaving comfortable margin
 * under typical block gas limits while keeping the number of sequential
 * transactions for a ~100-node campaign small (~5).
 *
 * Chunks are applied sequentially, and each chunk's rows are marked
 * published (publishedTitle/publishedDescription set, dirtyAt cleared)
 * only after that chunk's transaction confirms — so a failure partway
 * through leaves already-confirmed chunks published and only the
 * remaining rows still dirty. Calling this route again naturally retries
 * just what's left; no separate resumption bookkeeping needed.
 *
 * Gated on requireNodeContentPublisher — either a web2 admin session, or a
 * wallet signature over buildNodeContentPublishSignMessage(graphType,
 * nodeIds, contentHash) plus an on-chain isNodeEditor check against
 * NodeContentRegistry. contentHash is computed here from the dirty rows
 * actually about to be published (computeNodeContentBatchHash) and checked
 * against the client-supplied hash embedded in the signed message inside
 * requireNodeContentPublisher — a client that signed approval for stale
 * content (e.g. another admin published in the meantime) gets rejected
 * rather than having its signature applied to different content than what
 * it saw.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { prisma } from "@/app/lib/prisma";
import { requireNodeContentPublisher } from "@/app/lib/auth";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "@/app/config/contracts";
import { computeNodeContentBatchHash } from "@/app/utils/nodeContentSignMessage";

const CHUNK_SIZE = 20;

function parseGraphType(value: unknown): "CAMPAIGN" | "ROGUELIKE" | null {
  return value === "CAMPAIGN" || value === "ROGUELIKE" ? value : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
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

  const dirtyRows = await prisma.nodeContent.findMany({
    where: { graphType, nodeId: { in: parsedNodeIds }, dirtyAt: { not: null } },
  });

  const expectedContentHash = computeNodeContentBatchHash(dirtyRows);
  const { error } = await requireNodeContentPublisher(body, "publish", expectedContentHash);
  if (error) return error;

  if (dirtyRows.length === 0) {
    return NextResponse.json({ publishedCount: 0, chunkCount: 0 });
  }

  const rawKey = process.env.NODE_CONTENT_PUBLISHER_PRIVATE_KEY ?? "";
  if (!rawKey) {
    return NextResponse.json(
      { error: "NODE_CONTENT_PUBLISHER_PRIVATE_KEY is not configured on the server." },
      { status: 500 },
    );
  }
  const publisherKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(publisherKey);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

  const registryAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
    .NODE_CONTENT_REGISTRY as `0x${string}`;
  const isRoguelike = graphType === "ROGUELIKE";

  const chunks = chunk(dirtyRows, CHUNK_SIZE);
  let publishedCount = 0;

  for (const rowsInChunk of chunks) {
    try {
      const hash = await walletClient.writeContract({
        address: registryAddress,
        abi: CONTRACT_ABIS.NODE_CONTENT_REGISTRY,
        functionName: "setNodeContentBatch",
        args: [
          rowsInChunk.map(() => isRoguelike),
          rowsInChunk.map((row) => BigInt(row.nodeId)),
          rowsInChunk.map((row) => row.title),
          rowsInChunk.map((row) => row.description),
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      await prisma.$transaction(
        rowsInChunk.map((row) =>
          prisma.nodeContent.update({
            where: { id: row.id },
            data: {
              publishedTitle: row.title,
              publishedDescription: row.description,
              dirtyAt: null,
            },
          }),
        ),
      );
      publishedCount += rowsInChunk.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const outOfFunds =
        message.includes("gas required exceeds allowance (0)") ||
        message.includes("insufficient funds");
      console.error("[node-content publish] chunk failed:", message);
      return NextResponse.json(
        {
          publishedCount,
          chunkCount: chunks.length,
          error: outOfFunds
            ? "Publisher wallet is out of funds — contact an admin to fund it, then retry."
            : `Publish failed partway through: ${message}. Already-published nodes are safe; retry to continue with the rest.`,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ publishedCount, chunkCount: chunks.length });
}
