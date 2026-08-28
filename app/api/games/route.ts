import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../lib/auth";
import { stringifyWithBigint } from "../../lib/bigintJson";
import type { Web2GameDataView } from "../../types/web2Game";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const games = await prisma.game.findMany({
    where: {
      OR: [{ player1Id: userId! }, { player2Id: userId! }],
    },
    include: { lobby: { select: { mapId: true } } },
    orderBy: { createdAt: "desc" },
    // Bounded — without this, a long-tenured player's entire game history
    // (full state JSON per row) is re-fetched on every poll of this route.
    take: 100,
  });

  const gameViews = games.map((g) => {
    const state = g.state as unknown as Web2GameDataView;
    // Patch mapId from lobby for games created before this field was added to state
    if (!state.mapId && g.lobby.mapId) state.mapId = g.lobby.mapId;
    // Patch winner from DB columns if game ended via timeout (state JSON may lag)
    if (g.winnerId && state.metadata?.winner === "") {
      state.metadata = { ...state.metadata, winner: g.winnerId };
    }
    return state;
  });

  const playerIds = new Set<string>();
  gameViews.forEach((v) => {
    if (v.metadata?.creator) playerIds.add(v.metadata.creator);
    if (v.metadata?.joiner) playerIds.add(v.metadata.joiner);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(playerIds) } },
    select: { id: true, username: true, email: true },
  });
  const labelById = new Map(
    users.map((u) => [u.id, u.username || u.email.split("@")[0] || `Player #${u.id.slice(0, 8)}`]),
  );
  gameViews.forEach((v) => {
    if (!v.metadata) return;
    v.metadata.creatorLabel = labelById.get(v.metadata.creator) ?? v.metadata.creator;
    v.metadata.joinerLabel = labelById.get(v.metadata.joiner) ?? v.metadata.joiner;
  });

  return new NextResponse(stringifyWithBigint(gameViews), {
    headers: { "Content-Type": "application/json" },
  });
}
