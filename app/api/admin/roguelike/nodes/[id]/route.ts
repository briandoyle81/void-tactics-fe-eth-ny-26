import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

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

  const node = await prisma.roguelikeNode.update({ where: { id }, data: parsed });
  return NextResponse.json(node);
}
