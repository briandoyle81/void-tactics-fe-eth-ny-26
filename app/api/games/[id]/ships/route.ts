import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/auth";
import { dbShipToShip } from "../../../../lib/dbToType";
import { stringifyWithBigint } from "../../../../lib/bigintJson";
import type { Web2GameDataView } from "../../../../types/web2Game";

// GET /api/games/[id]/ships — returns all ships for a game (both players).
// Caller must be a player in the game. Explicitly deferred from the Ships
// subsystem port since it depends on the Game model.
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
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = game.state as unknown as Web2GameDataView;
  const shipIds = state.shipIds ?? [];

  const dbShips = shipIds.length > 0
    ? await prisma.ship.findMany({ where: { id: { in: shipIds } } })
    : [];

  const shipMap = new Map(dbShips.map((s) => [s.id, s]));
  const ships = shipIds.map((id) => shipMap.get(id)).filter((s) => s != null).map((s) => dbShipToShip(s));

  return new NextResponse(stringifyWithBigint(ships), {
    headers: { "Content-Type": "application/json" },
  });
}
