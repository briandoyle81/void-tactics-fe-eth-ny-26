import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET(
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
    select: {
      initialState: true,
      turns: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          playerId: true,
          round: true,
          actions: true,
          snapshot: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    initialState: game.initialState,
    turns: game.turns,
  });
}
