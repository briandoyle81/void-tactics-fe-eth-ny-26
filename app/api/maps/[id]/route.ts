import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth, requireWeb2Admin } from "../../../lib/auth";
import { invalidateMapTiles } from "../../../lib/getMapTiles";

// GET /api/maps/[id] — blocked/scoring tiles for a map. `Web2GameDataView`
// only stores `mapId`, not the tile data itself (matching how the server
// engine already loads `game.lobby.map` separately) — the client needs this
// to build blockedGrid/scoringGrid for range/LOS and rendering.
//
// `?fields=name` returns just the name — for callers that only need it for
// display (e.g. useMapNameWeb2.ts, used per game-list card) and would
// otherwise pull the full tile arrays just to read one string field.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const mapId = Number(id);
  if (isNaN(mapId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  if (req.nextUrl.searchParams.get("fields") === "name") {
    const map = await prisma.map.findUnique({ where: { id: mapId }, select: { name: true } });
    if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ name: map.name });
  }

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

// PATCH /api/maps/[id] — update a map's tiles. Web2-mode counterpart to
// web3's Maps.updatePresetMap, gated on WEB2_ADMIN_EMAILS.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const { id } = await params;
  const mapId = Number(id);
  if (isNaN(mapId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { name, blockedTiles, scoringTiles } = body;

  const map = await prisma.map.update({
    where: { id: mapId },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(blockedTiles !== undefined ? { blockedTiles } : {}),
      ...(scoringTiles !== undefined ? { scoringTiles } : {}),
    },
  });
  invalidateMapTiles(mapId);

  return NextResponse.json({ id: map.id });
}
