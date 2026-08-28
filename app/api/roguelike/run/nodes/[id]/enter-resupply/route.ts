/**
 * POST /api/roguelike/run/nodes/[id]/enter-resupply
 *
 * Web2 counterpart to RoguelikeMatch.enterResupplyNode — advances the run's
 * position to a reachable Resupply node. No Game/Lobby involved.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const targetNodeId = Number((await params).id);
  if (!Number.isInteger(targetNodeId)) {
    return NextResponse.json({ error: "Invalid node id" }, { status: 400 });
  }

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
  });
  if (!run) {
    return NextResponse.json({ error: "No active run" }, { status: 404 });
  }
  if (run.activeLobbyId) {
    return NextResponse.json({ error: "A match is already in progress" }, { status: 409 });
  }

  const node = await prisma.roguelikeNode.findUnique({ where: { id: targetNodeId } });
  if (!node || node.kind !== 1) {
    return NextResponse.json({ error: "This node isn't a resupply node" }, { status: 400 });
  }

  if (targetNodeId !== run.currentNodeId) {
    const edge = await prisma.roguelikeEdge.findFirst({
      where: {
        OR: [
          { parentId: run.currentNodeId, childId: targetNodeId },
          { parentId: targetNodeId, childId: run.currentNodeId, twoWay: true },
        ],
      },
    });
    if (!edge) {
      return NextResponse.json(
        { error: "This node isn't reachable from your current position" },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.roguelikeRun.update({
    where: { id: run.id },
    data: { currentNodeId: targetNodeId },
  });

  return NextResponse.json({ run: updated });
}
