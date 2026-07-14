import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireWeb2Admin } from "../../lib/auth";

// GET /api/maps — list all maps. Web2-mode counterpart to web3's
// useGetAllPresetMaps (any signed-in user can view; only admins can create).
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const maps = await prisma.map.findMany({ orderBy: { id: "asc" }, take: 200 });
  return NextResponse.json(
    maps.map((map) => ({
      id: map.id,
      name: map.name,
      gridWidth: map.gridWidth,
      gridHeight: map.gridHeight,
      blockedTiles: map.blockedTiles,
      scoringTiles: map.scoringTiles,
    })),
  );
}

// POST /api/maps — create a new map. Web2-mode counterpart to web3's
// Maps.createPresetMap, gated on WEB2_ADMIN_EMAILS instead of
// MAP_ADMIN_ADDRESS (see requireWeb2Admin).
export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const { name, gridWidth, gridHeight, blockedTiles, scoringTiles } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const map = await prisma.map.create({
    data: {
      name: name.trim(),
      gridWidth: typeof gridWidth === "number" ? gridWidth : undefined,
      gridHeight: typeof gridHeight === "number" ? gridHeight : undefined,
      blockedTiles: blockedTiles ?? [],
      scoringTiles: scoringTiles ?? [],
    },
  });

  return NextResponse.json({ id: map.id });
}
