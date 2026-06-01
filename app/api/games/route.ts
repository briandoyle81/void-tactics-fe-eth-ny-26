import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { GameDataView } from "@/app/types/types";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const games = await prisma.game.findMany({
    where: {
      OR: [{ player1Id: userId! }, { player2Id: userId! }],
    },
    include: { lobby: { select: { mapId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const gameViews = games.map((g) => {
    const state = g.state as unknown as GameDataView;
    // Patch mapId from lobby for games created before this field was added to state
    if (!state.mapId && g.lobby.mapId) state.mapId = g.lobby.mapId;
    // Patch winner from DB columns if game ended via timeout (state JSON may lag)
    if (g.winnerId && state.metadata?.winner === ZERO_ADDR) {
      state.metadata = { ...state.metadata, winner: g.winnerId };
    }
    return state;
  });
  return new NextResponse(stringifyWithBigint(gameViews), {
    headers: { "Content-Type": "application/json" },
  });
}
