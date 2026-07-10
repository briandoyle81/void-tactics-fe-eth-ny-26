import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/auth";

// GET /api/maps/[id] — blocked/scoring tiles for a map. `Web2GameDataView`
// only stores `mapId`, not the tile data itself (matching how the server
// engine already loads `game.lobby.map` separately) — the client needs this
// to build blockedGrid/scoringGrid for range/LOS and rendering.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const mapId = Number(id);
  if (isNaN(mapId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const map = await prisma.map.findUnique({ where: { id: mapId } });
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    name: map.name,
    gridWidth: map.gridWidth,
    gridHeight: map.gridHeight,
    blockedTiles: map.blockedTiles,
    scoringTiles: map.scoringTiles,
  });
}
