import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { createGameFromLobby } from "@/app/lib/createGameFromLobby";
import { stringifyWithBigint } from "@/app/lib/bigintJson";

// POST /api/lobbies/[id]/accept — both players have set their fleets; start the game
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { fleets: true },
  });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.creatorId !== userId && lobby.joinerId !== userId) {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }
  if (!lobby.joinerId) return NextResponse.json({ error: "Waiting for joiner" }, { status: 409 });
  if (lobby.status === "IN_GAME") return NextResponse.json({ error: "Game already started" }, { status: 409 });

  const creatorFleet = lobby.fleets.find((f) => f.ownerId === lobby.creatorId);
  const joinerFleet  = lobby.fleets.find((f) => f.ownerId === lobby.joinerId!);
  if (!creatorFleet?.isComplete || !joinerFleet?.isComplete) {
    return NextResponse.json({ error: "Both players must submit their fleets first" }, { status: 409 });
  }

  const gameId = await createGameFromLobby(
    { ...lobby, joinerId: lobby.joinerId! },
    creatorFleet,
    joinerFleet,
  );

  return new NextResponse(
    stringifyWithBigint({ gameId }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
}
