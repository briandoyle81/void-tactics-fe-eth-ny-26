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
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.phase !== "ACTIVE") return NextResponse.json({ error: "Game not active" }, { status: 409 });

  // The winner is the player whose turn it is NOT (the other player let time run out)
  const winnerId = game.currentTurn === game.player1Id ? game.player2Id : game.player1Id;

  const gameFleets = await prisma.fleet.findMany({ where: { lobbyId: game.lobbyId } });
  const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds as number[]);

  await prisma.$transaction([
    prisma.game.update({ where: { id: gameId }, data: { phase: "TIMED_OUT", winnerId } }),
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
