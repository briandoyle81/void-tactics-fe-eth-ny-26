import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET/POST /api/admin/campaign/nodes — web2 counterpart to web3's
// NodeMap.createNode/getNodesInCampaign, gated the same way as the other
// web2 admin routes (requireWeb2Admin).

function parseNodeBody(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const campaignId = Number(b.campaignId);
  const mapId = Number(b.mapId);
  const prerequisites = Array.isArray(b.prerequisites)
    ? b.prerequisites.map((p) => Number(p)).filter((p) => Number.isInteger(p))
    : [];
  const costLimit = Number(b.costLimit);
  const turnTimeSeconds = Number(b.turnTimeSeconds);
  const maxScore = Number(b.maxScore);
  const creatorGoesFirst = b.creatorGoesFirst !== false;

  if (
    !Number.isInteger(campaignId) ||
    !Number.isInteger(mapId) ||
    !Number.isInteger(costLimit) ||
    !Number.isInteger(turnTimeSeconds) ||
    !Number.isInteger(maxScore)
  ) {
    return null;
  }
  return { campaignId, mapId, prerequisites, costLimit, turnTimeSeconds, maxScore, creatorGoesFirst };
}

export async function GET(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const campaignIdParam = req.nextUrl.searchParams.get("campaignId");
  const nodes = await prisma.campaignNode.findMany({
    where: campaignIdParam ? { campaignId: Number(campaignIdParam) } : undefined,
    orderBy: { id: "asc" },
  });
  return NextResponse.json(nodes);
}

export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const parsed = parseNodeBody(await req.json());
  if (!parsed) {
    return NextResponse.json({ error: "Invalid node fields" }, { status: 400 });
  }

  const node = await prisma.campaignNode.create({ data: parsed });
  return NextResponse.json(node, { status: 201 });
}
