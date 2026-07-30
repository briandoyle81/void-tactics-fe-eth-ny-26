import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/auth";
import { takeAiTurn, AiTurnError } from "../../../../lib/aiTurnWeb2";

// POST /api/games/[id]/ai-turn — takes exactly one AI ship's move. The web2
// counterpart to SinglePlayerMatch.takeAITurn: the client calls this
// repeatedly while it's the AI's turn (see useAITurnLoopWeb2.ts). Scoped to
// the game's own human participant rather than fully permissionless (unlike
// web3, there's no gas cost gating who bothers to call this, so an
// unrelated authenticated user could otherwise spam-advance someone else's
// game).
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
    where: { id: gameId, OR: [{ player1Id: userId! }, { player2Id: userId! }] },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await takeAiTurn(gameId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiTurnError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
