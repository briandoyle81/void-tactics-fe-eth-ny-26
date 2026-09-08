/**
 * GET /api/campaign/nodes?campaignId=1
 *
 * Web2 counterpart to NodeMap.getNodesInCampaign + getNode + isNodeUnlocked/
 * isNodeCompleted — the campaign graph for one campaign, with per-node
 * unlocked/completed state for the current user. Unlock is ANY-of over
 * `prerequisites`, computed here from CampaignNodeCompletion rather than
 * stored, matching NodeMap.isNodeUnlocked exactly.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await requireAuth();

  const campaignIdParam = req.nextUrl.searchParams.get("campaignId");
  const campaignId = campaignIdParam ? Number(campaignIdParam) : NaN;
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const [campaign, nodes, completions] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.campaignNode.findMany({ where: { campaignId }, orderBy: { id: "asc" } }),
    userId
      ? prisma.campaignNodeCompletion.findMany({ where: { userId } })
      : Promise.resolve([]),
  ]);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const completedNodeIds = new Set(completions.map((c) => c.nodeId));

  const result = nodes.map((node) => ({
    ...node,
    completed: completedNodeIds.has(node.id),
    unlocked:
      node.prerequisites.length === 0 ||
      node.prerequisites.some((p) => completedNodeIds.has(p)),
  }));

  return NextResponse.json({ campaign, nodes: result });
}
