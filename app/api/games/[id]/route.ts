import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/auth";
import { stringifyWithBigint } from "../../../lib/bigintJson";
import type { Web2GameDataView } from "../../../types/web2Game";

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
    include: { lobby: { select: { mapId: true, campaignNodeId: true, roguelikeRunId: true } } },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = game.state as unknown as Web2GameDataView;
  // Patch mapId from lobby for games created before this field was added to state
  if (!state.mapId && game.lobby.mapId) state.mapId = game.lobby.mapId;
  // Patch winner from DB columns if game ended via timeout (state JSON may lag)
  if (game.winnerId && state.metadata?.winner === "") {
    state.metadata = { ...state.metadata, winner: game.winnerId };
  }
  // Always attach from the Lobby row (never persisted into state at game-
  // creation time), so GameDisplayWeb2 can tell a plain PvP/vs-AI game apart
  // from a Campaign mission or Roguelike combat node.
  state.metadata = {
    ...state.metadata,
    campaignNodeId: game.lobby.campaignNodeId,
    roguelikeRunId: game.lobby.roguelikeRunId,
  };

  return new NextResponse(stringifyWithBigint(state), {
    headers: { "Content-Type": "application/json" },
  });
}
