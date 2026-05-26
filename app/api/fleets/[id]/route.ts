import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";

// GET /api/fleets/[id] — returns the fleet and its ships.
// Caller must be a player in the lobby that owns the fleet.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const fleetId = Number(id);
  if (isNaN(fleetId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const fleet = await prisma.fleet.findUnique({
    where: { id: fleetId },
    include: {
      lobby: { select: { creatorId: true, joinerId: true } },
    },
  });

  if (!fleet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Must be a player in the lobby that owns this fleet
  const { creatorId, joinerId } = fleet.lobby;
  if (userId !== creatorId && userId !== joinerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shipIds = fleet.shipIds as number[];
  const rawPositions = (fleet.startingPositions ?? []) as Array<{ row: number; col: number }>;

  const dbShips = shipIds.length > 0
    ? await prisma.ship.findMany({ where: { id: { in: shipIds } } })
    : [];

  // Preserve the order from shipIds
  const shipMap = new Map(dbShips.map((s) => [s.id, s]));
  const ships = shipIds.map((sid) => shipMap.get(sid)).filter(Boolean).map((s) => dbShipToShip(s!));

  // Pair each ship with its starting grid position
  const positions = shipIds.map((sid, i) => ({
    shipId: sid,
    row: rawPositions[i]?.row ?? 0,
    col: rawPositions[i]?.col ?? 0,
  }));

  return NextResponse.json({ id: fleet.id, ownerId: fleet.ownerId, ships, positions });
}
