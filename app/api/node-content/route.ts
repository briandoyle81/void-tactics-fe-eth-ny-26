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
import { requireWeb2Admin } from "@/app/lib/auth";
import { NodeGraphType } from "@/app/generated/prisma";

function parseGraphType(value: string | null): NodeGraphType | null {
  if (value === "CAMPAIGN" || value === "ROGUELIKE") return value;
  return null;
}

export async function GET(req: NextRequest) {
  // Public on purpose (see header): every viewer renders node text, and
  // wallet (web3) players have no NextAuth session. Requiring one here made
  // every web3 client fall back to the static placeholder content, so
  // saved edits never appeared.
  const graphType = parseGraphType(req.nextUrl.searchParams.get("graphType"));
  if (!graphType) {
    return NextResponse.json({ error: "graphType must be CAMPAIGN or ROGUELIKE" }, { status: 400 });
  }

  const rows = await prisma.nodeContent.findMany({
    where: { graphType },
    select: { graphType: true, nodeId: true, title: true, description: true },
  });
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  // Web2 only: web3 node text lives on chain in NodeContentRegistry and is
  // written by the editor's own wallet transaction (useSaveOnChainNodeContent).
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
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

  const row = await prisma.nodeContent.upsert({
    where: { graphType_nodeId: { graphType, nodeId } },
    create: { graphType, nodeId, title, description },
    update: { title, description },
  });

  return NextResponse.json(row);
}
