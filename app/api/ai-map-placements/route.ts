import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// GET /api/ai-map-placements?mapId=1 — player-facing (not admin-gated) read
// of a single map's AI placements, for enemy-fleet previews (mission cards,
// fleet-selection maps, roguelike threat display). Same query as
// /api/admin/ai-map-placements' GET, minus the requireWeb2Admin() gate —
// mirrors web3's public on-chain AIEncounters.getMapPlacements read, which
// has no admin restriction. The admin route keeps its own GET (used by
// AIEncountersAdminPanelWeb2's editor) alongside PUT/DELETE.
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const mapId = Number(req.nextUrl.searchParams.get("mapId"));
  if (!Number.isInteger(mapId) || mapId <= 0) {
    return NextResponse.json({ error: "mapId is required" }, { status: 400 });
  }

  const placements = await prisma.aIMapPlacement.findMany({
    where: { mapId },
    include: { config: true },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });
  return NextResponse.json(placements);
}
