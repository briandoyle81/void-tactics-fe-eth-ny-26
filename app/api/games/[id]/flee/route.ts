import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import type { GameDataView } from "@/app/types/types";

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
    where: {
      id: gameId,
      OR: [{ player1Id: userId! }, { player2Id: userId! }],
    },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.phase !== "ACTIVE") return NextResponse.json({ error: "Game not active" }, { status: 409 });

  const state = game.state as unknown as GameDataView;
  const isCreator = String(state.metadata.creator) === userId!;
  const winnerId = isCreator ? game.player2Id! : game.player1Id!;
  const loserId = userId!;

  const newState: GameDataView = {
    ...state,
    metadata: { ...state.metadata, winner: winnerId },
  };

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { state: newState as object, phase: "COMPLETED" as any, winnerId },
    });

    await tx.playerStats.upsert({
      where: { userId: winnerId },
      update: { wins: { increment: 1 }, totalGames: { increment: 1 } },
      create: { userId: winnerId, wins: 1, totalGames: 1 },
    });
    await tx.playerStats.upsert({
      where: { userId: loserId },
      update: { losses: { increment: 1 }, totalGames: { increment: 1 } },
      create: { userId: loserId, losses: 1, totalGames: 1 },
    });

    const gameFleets = await tx.fleet.findMany({ where: { lobbyId: game.lobbyId } });
    const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds as number[]);
    if (allFleetShipIds.length > 0) {
      await tx.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } });
    }
  });

  return NextResponse.json(newState);
}
