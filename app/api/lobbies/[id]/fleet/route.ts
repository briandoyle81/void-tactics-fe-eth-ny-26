import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { createGameFromLobby } from "@/app/lib/createGameFromLobby";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.creatorId !== userId && lobby.joinerId !== userId) {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }

  const body = await req.json();
  const { shipIds, startingPositions } = body as {
    shipIds: number[];
    startingPositions: Array<{ row: number; col: number }>;
  };

  if (!shipIds?.length) return NextResponse.json({ error: "shipIds required" }, { status: 400 });

  // Verify all ships belong to this user and aren't destroyed
  const ships = await prisma.ship.findMany({
    where: { id: { in: shipIds }, ownerId: userId!, destroyed: false },
  });
  if (ships.length !== shipIds.length) {
    return NextResponse.json({ error: "Invalid ship selection" }, { status: 400 });
  }

  const totalCost = ships.reduce((sum, s) => sum + s.cost, 0);

  // Validate cost limit
  if (lobby.costLimit > 0 && totalCost > lobby.costLimit) {
    return NextResponse.json({ error: `Fleet cost ${totalCost} exceeds limit ${lobby.costLimit}` }, { status: 400 });
  }

  // Upsert fleet (replace existing if re-submitting)
  const existingFleet = await prisma.fleet.findFirst({ where: { lobbyId, ownerId: userId! } });

  let fleet;
  if (existingFleet) {
    fleet = await prisma.fleet.update({
      where: { id: existingFleet.id },
      data: { shipIds, totalCost, startingPositions: startingPositions ?? null, isComplete: true },
    });
  } else {
    fleet = await prisma.fleet.create({
      data: { ownerId: userId!, lobbyId, shipIds, totalCost, startingPositions: startingPositions ?? null, isComplete: true },
    });
  }

  // Mark ships as in-fleet; if this is the joiner, record when they submitted their fleet
  const isJoiner = lobby.joinerId === userId;
  await Promise.all([
    prisma.ship.updateMany({ where: { id: { in: shipIds } }, data: { inFleet: true } }),
    ...(isJoiner
      ? [prisma.lobby.update({ where: { id: lobbyId }, data: { joinerFleetSetAt: new Date() } })]
      : []),
  ]);

  // Auto-start game when both players have submitted complete fleets
  let gameId: number | null = null;
  if (lobby.joinerId && lobby.status !== "IN_GAME") {
    const allFleets = await prisma.fleet.findMany({ where: { lobbyId, isComplete: true } });
    const creatorFleet = allFleets.find((f) => f.ownerId === lobby.creatorId);
    const joinerFleet  = allFleets.find((f) => f.ownerId === lobby.joinerId!);
    if (creatorFleet && joinerFleet) {
      try {
        gameId = await createGameFromLobby(
          { ...lobby, joinerId: lobby.joinerId! },
          creatorFleet,
          joinerFleet,
        );
      } catch {
        // Game may have already been created by the other player's concurrent request
      }
    }
  }

  return NextResponse.json({ id: fleet.id, totalCost, shipCount: shipIds.length, gameId }, { status: 201 });
}
