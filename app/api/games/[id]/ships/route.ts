import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { GameDataView } from "@/app/types/types";

// GET /api/games/[id]/ships — returns all ships for a game (both players).
// Caller must be a player in the game.
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

  const state = game.state as unknown as GameDataView;
  const shipIds = (state.shipIds ?? []) as number[];

  const dbShips = shipIds.length > 0
    ? await prisma.ship.findMany({ where: { id: { in: shipIds } } })
    : [];

  const shipMap = new Map(dbShips.map((s) => [s.id, s]));
  const ships = shipIds.map((id) => shipMap.get(id)).filter(Boolean).map((s) => dbShipToShip(s!));

  return new NextResponse(stringifyWithBigint(ships), {
    headers: { "Content-Type": "application/json" },
  });
}
