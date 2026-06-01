import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const gameId = Number(id);
  if (isNaN(gameId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const game = await prisma.game.findFirst({
    where: { id: gameId, OR: [{ player1Id: userId! }, { player2Id: userId! }] },
    include: { lobby: true },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.phase !== "ACTIVE") return NextResponse.json({ error: "Game not active" }, { status: 409 });

  const state = game.state as { turnState?: { turnStartTime?: number } };
  const turnStartTime = state.turnState?.turnStartTime ?? 0;
  const elapsedMs = turnStartTime > 0 ? Date.now() - turnStartTime : Infinity;
  if (elapsedMs < game.lobby.turnTimeSeconds * 1000) {
    return NextResponse.json({ error: "Turn has not timed out yet" }, { status: 409 });
  }

  // The winner is the player whose turn it is NOT (the other player let time run out)
  const winnerId = game.currentTurn === game.player1Id ? game.player2Id : game.player1Id;

  // Patch metadata.winner into the state JSON so the client sees the result immediately
  const rawState = game.state as Record<string, unknown>;
  const patchedState = {
    ...rawState,
    metadata: {
      ...(rawState.metadata as Record<string, unknown>),
      winner: winnerId,
    },
  };

  const gameFleets = await prisma.fleet.findMany({ where: { lobbyId: game.lobbyId } });
  const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds as number[]);

  await prisma.$transaction([
    prisma.game.update({ where: { id: gameId }, data: { phase: "TIMED_OUT", winnerId, state: patchedState } }),
    prisma.playerStats.upsert({
      where: { userId: winnerId },
      update: { wins: { increment: 1 }, totalGames: { increment: 1 } },
      create: { userId: winnerId, wins: 1, totalGames: 1 },
    }),
    prisma.playerStats.upsert({
      where: { userId: game.currentTurn },
      update: { losses: { increment: 1 }, totalGames: { increment: 1 } },
      create: { userId: game.currentTurn, losses: 1, totalGames: 1 },
    }),
    ...(allFleetShipIds.length > 0
      ? [prisma.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } })]
      : []),
  ]);

  return NextResponse.json({ winnerId });
}
