import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { GameDataView } from "@/app/types/types";

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
    include: { lobby: { select: { mapId: true } } },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = game.state as unknown as GameDataView;
  // Patch mapId from lobby for games created before this field was added to state
  if (!state.mapId && game.lobby.mapId) state.mapId = game.lobby.mapId;
  // Patch winner from DB columns if game ended via timeout (state JSON may lag)
  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  if (game.winnerId && state.metadata?.winner === ZERO_ADDR) {
    state.metadata = { ...state.metadata, winner: game.winnerId };
  }

  return new NextResponse(stringifyWithBigint(state), {
    headers: { "Content-Type": "application/json" },
  });
}
