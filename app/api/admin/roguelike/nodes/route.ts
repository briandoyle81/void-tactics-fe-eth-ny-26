import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET/POST /api/admin/roguelike/nodes — web2 counterpart to
// RoguelikeNodeMap.createNode/getNode. Takes every field regardless of
// kind (Combat=0/Resupply=1) — Combat-only fields are meaningless but
// harmless for a Resupply node, same as the on-chain contract's shape.

function parseNodeBody(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const campaignId = Number(b.campaignId);
  const kind = Number(b.kind);
  if (!Number.isInteger(campaignId) || (kind !== 0 && kind !== 1)) return null;

  const mapId = b.mapId != null && b.mapId !== "" ? Number(b.mapId) : null;
  const turnTimeSeconds = b.turnTimeSeconds != null && b.turnTimeSeconds !== "" ? Number(b.turnTimeSeconds) : null;
  const maxScore = b.maxScore != null && b.maxScore !== "" ? Number(b.maxScore) : null;
  const creatorGoesFirst = typeof b.creatorGoesFirst === "boolean" ? b.creatorGoesFirst : null;
  const costCapOverride = b.costCapOverride != null && b.costCapOverride !== "" ? Number(b.costCapOverride) : null;

  if (kind === 0 && (mapId == null || turnTimeSeconds == null || maxScore == null)) return null;

  return { campaignId, kind, mapId, turnTimeSeconds, maxScore, creatorGoesFirst, costCapOverride };
}

export async function GET(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const campaignIdParam = req.nextUrl.searchParams.get("campaignId");
  const nodes = await prisma.roguelikeNode.findMany({
    where: campaignIdParam ? { campaignId: Number(campaignIdParam) } : undefined,
    include: { childEdges: true },
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

  const node = await prisma.roguelikeNode.create({ data: parsed });
  return NextResponse.json(node, { status: 201 });
}
