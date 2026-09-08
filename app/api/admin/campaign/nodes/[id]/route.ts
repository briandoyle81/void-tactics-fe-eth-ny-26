import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const id = Number((await params).id);
  const parsed = parseNodeBody(await req.json());
  if (!parsed) {
    return NextResponse.json({ error: "Invalid node fields" }, { status: 400 });
  }

  const node = await prisma.campaignNode.update({ where: { id }, data: parsed });
  return NextResponse.json(node);
}
