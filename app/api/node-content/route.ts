/**
 * GET/PUT /api/node-content
 *
 * Title/description overlay for a campaign or roguelike node, keyed by
 * (graphType, nodeId) — see the NodeContent model's doc-comment in
 * schema.prisma. GET is player-facing (every viewer needs this to render
 * node labels/descriptions, not just admins) — only PUT is admin-gated.
 * A row here is layered on top of the hand-maintained campaignNodes.ts/
 * roguelikeNodes.ts static fallback content by useNodeContent.ts, not
 * replacing it.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth, requireNodeContentEditor } from "@/app/lib/auth";
import { NodeGraphType } from "@/app/generated/prisma";

function parseGraphType(value: string | null): NodeGraphType | null {
  if (value === "CAMPAIGN" || value === "ROGUELIKE") return value;
  return null;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const graphType = parseGraphType(req.nextUrl.searchParams.get("graphType"));
  if (!graphType) {
    return NextResponse.json({ error: "graphType must be CAMPAIGN or ROGUELIKE" }, { status: 400 });
  }

  const rows = await prisma.nodeContent.findMany({ where: { graphType } });
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const { error } = await requireNodeContentEditor(body);
  if (error) return error;

  const graphType = parseGraphType(body?.graphType ?? null);
  const nodeId = Number(body?.nodeId);
  const title = typeof body?.title === "string" ? body.title : null;
  const description = typeof body?.description === "string" ? body.description : null;

  if (!graphType || !Number.isInteger(nodeId) || title === null || description === null) {
    return NextResponse.json(
      { error: "graphType (CAMPAIGN|ROGUELIKE), nodeId, title, and description are required" },
      { status: 400 },
    );
  }

  // dirtyAt marks this row as having an unpublished on-chain edit (see
  // NodeContentRegistry.sol / publish/route.ts) unless the saved content
  // is identical to what's already published — e.g. re-saving unchanged
  // content, or a save that happens to match a value sync/route.ts just
  // pulled back from chain — in which case there's nothing new to publish.
  const existing = await prisma.nodeContent.findUnique({
    where: { graphType_nodeId: { graphType, nodeId } },
  });
  const matchesPublished =
    existing != null &&
    existing.publishedTitle === title &&
    existing.publishedDescription === description;

  const row = await prisma.nodeContent.upsert({
    where: { graphType_nodeId: { graphType, nodeId } },
    create: { graphType, nodeId, title, description, dirtyAt: new Date() },
    update: { title, description, dirtyAt: matchesPublished ? null : new Date() },
  });

  return NextResponse.json(row);
}
