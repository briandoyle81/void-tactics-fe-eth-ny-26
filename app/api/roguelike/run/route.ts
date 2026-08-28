/**
 * GET /api/roguelike/run
 *
 * Web2 counterpart to RoguelikeRun.getRun/hasActiveRun — the current
 * player's active run (or null), with roster + HP. 0 hp = undamaged/full,
 * matching the on-chain getShipHP convention.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
    include: {
      campaign: true,
      roster: { include: { ship: true } },
      defeats: true,
    },
  });

  return NextResponse.json({
    run: run && { ...run, defeatedNodeIds: run.defeats.map((d) => d.nodeId) },
  });
}
