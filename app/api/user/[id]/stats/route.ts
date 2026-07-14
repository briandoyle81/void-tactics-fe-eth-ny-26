import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// GET /api/user/[id]/stats — a player's win/loss record. Web2-mode
// counterpart to web3's `usePlayerStats(address, chainId)` (an on-chain
// read) — shown next to a lobby's creator/joiner in LobbiesWeb2.tsx, same
// as Lobbies.tsx's `CreatorStats`. Any signed-in user can view any other
// user's basic record (matches the on-chain read being public), gated only
// on being signed in at all.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const stats = await prisma.playerStats.findUnique({
    where: { userId: id },
    select: { wins: true, losses: true },
  });

  return NextResponse.json({ wins: stats?.wins ?? 0, losses: stats?.losses ?? 0 });
}
