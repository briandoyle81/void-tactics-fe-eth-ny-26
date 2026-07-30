import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET /api/admin/ai-map-placements?mapId=1 — list placements for a map.
// PUT  { mapId, row, col, configId } — upsert a single placement (matches
// web3's AIEncounters.setMapPlacement 1:1).
// DELETE { mapId, row, col } — clear a placement.

export async function GET(req: NextRequest) {
  const { error } = await requireWeb2Admin();
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

export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const { mapId, row, col, configId } = body ?? {};

  if (!Number.isInteger(mapId) || mapId <= 0) {
    return NextResponse.json({ error: "Invalid mapId" }, { status: 400 });
  }
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return NextResponse.json({ error: "Invalid row/col" }, { status: 400 });
  }
  if (!Number.isInteger(configId) || configId <= 0) {
    return NextResponse.json({ error: "Invalid configId" }, { status: 400 });
  }

  const placement = await prisma.aIMapPlacement.upsert({
    where: { mapId_row_col: { mapId, row, col } },
    update: { configId },
    create: { mapId, row, col, configId },
    include: { config: true },
  });
  return NextResponse.json(placement);
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const { mapId, row, col } = body ?? {};
  if (!Number.isInteger(mapId) || !Number.isInteger(row) || !Number.isInteger(col)) {
    return NextResponse.json({ error: "Invalid mapId/row/col" }, { status: 400 });
  }

  try {
    await prisma.aIMapPlacement.delete({ where: { mapId_row_col: { mapId, row, col } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Placement not found" }, { status: 404 });
  }
}
