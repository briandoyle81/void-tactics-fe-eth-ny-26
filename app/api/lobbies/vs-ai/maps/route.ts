import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// GET /api/lobbies/vs-ai/maps — player-facing (not admin-gated) list of map
// ids that have AI content configured, for the vs-AI map picker. Web2
// counterpart to web3's useAIEncounterMaps (AIEncounters.mapHasPlacements +
// getAllPresetMaps).
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const placements = await prisma.aIMapPlacement.findMany({
    distinct: ["mapId"],
    select: { mapId: true },
    orderBy: { mapId: "asc" },
  });
  return NextResponse.json(placements.map((p) => p.mapId));
}
