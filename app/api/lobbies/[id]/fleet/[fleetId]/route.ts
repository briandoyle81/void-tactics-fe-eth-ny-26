import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { stringifyWithBigint } from "@/app/lib/bigintJson";

// GET /api/lobbies/[id]/fleet/[fleetId] — a submitted fleet's ship roster,
// for the Fleet View Modal (mirrors web3's public on-chain fleet reads).
// Any ship's owner can be returned here (not just the requester's own
// ships, unlike /api/ships) — access is gated by lobby membership instead,
// since viewing an opponent's already-submitted fleet is the whole point.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fleetId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, fleetId } = await params;
  const lobbyId = Number(id);
  const fId = Number(fleetId);
  if (isNaN(lobbyId) || isNaN(fId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.creatorId !== userId && lobby.joinerId !== userId) {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }

  const fleet = await prisma.fleet.findUnique({ where: { id: fId } });
  if (!fleet || fleet.lobbyId !== lobbyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dbShips = await prisma.ship.findMany({ where: { id: { in: fleet.shipIds } } });
  const shipsById = new Map(dbShips.map((s) => [s.id, s]));
  const orderedShips = fleet.shipIds
    .map((sid) => shipsById.get(sid))
    .filter((s): s is (typeof dbShips)[number] => !!s);

  return new NextResponse(
    stringifyWithBigint({
      id: fleet.id,
      ownerId: fleet.ownerId,
      ships: orderedShips.map(dbShipToShip),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
