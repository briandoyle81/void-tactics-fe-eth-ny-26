import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/auth";
import { GamePhase } from "../../../../generated/prisma";
import type { Web2GameDataView } from "../../../../types/web2Game";
import { resolveTournamentMatchIfApplicable } from "../../../../lib/resolveTournamentMatchIfApplicable";

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
  if (game.phase !== GamePhase.ACTIVE) return NextResponse.json({ error: "Game not active" }, { status: 409 });

  const state = game.state as unknown as Web2GameDataView;
  const isCreator = state.metadata.creator === userId!;
  const winnerId = isCreator ? game.player2Id : game.player1Id;
  const loserId = userId!;

  const newState: Web2GameDataView = {
    ...state,
    metadata: { ...state.metadata, winner: winnerId },
  };

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: { state: newState as unknown as object, phase: GamePhase.COMPLETED, winnerId },
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
    const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds);
    if (allFleetShipIds.length > 0) {
      await tx.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } });
    }
  });

  await resolveTournamentMatchIfApplicable(game.lobbyId, winnerId);

  return NextResponse.json(newState);
}
