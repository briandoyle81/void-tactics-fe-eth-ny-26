/**
 * GET /api/roguelike/nodes/[id]
 *
 * Player-facing (non-admin) single-node read — web2 counterpart to
 * RoguelikeNodeMap.getNode. Includes both edge directions so the caller
 * can determine reachable children (childEdges) without a second request.
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

  const id = Number((await params).id);
  const node = await prisma.roguelikeNode.findUnique({
    where: { id },
    include: { childEdges: true },
  });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }
  return NextResponse.json(node);
}
