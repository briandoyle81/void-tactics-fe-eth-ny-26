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
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(stringifyWithBigint(game.state as unknown as GameDataView), {
    headers: { "Content-Type": "application/json" },
  });
}
