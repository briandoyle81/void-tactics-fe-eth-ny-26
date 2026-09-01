/**
 * GET /api/roguelike/campaigns/[id]/nodes
 *
 * Player-facing (non-admin) read of every node in a campaign — web2
 * counterpart to web3's useAllRoguelikeNodes (which forward-scans
 * getNode(1..nodeCount()); here it's one Prisma query). Powers
 * RoguelikeGraphWeb2's full-map view, same "load everything, filter/derive
 * client-side" approach the admin node list (`/api/admin/roguelike/nodes`)
 * already takes, just without the admin gate.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const campaignId = Number((await params).id);
  const nodes = await prisma.roguelikeNode.findMany({
    where: { campaignId },
    include: { childEdges: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(nodes);
}
