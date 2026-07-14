import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// Matches web3's config/tournament.ts CHAMPION_SHARE_PCT/RUNNER_UP_SHARE_PCT
// (60/40). No protocol-fee equivalent — nothing for it to fund in a closed
// credits economy.
const CHAMPION_SHARE_PCT = 60;
const RUNNER_UP_SHARE_PCT = 40;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const tournamentId = Number(id);
  if (isNaN(tournamentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: "Only the tournament creator can do this" }, { status: 403 });
  }
  if (tournament.state !== "ACTIVE" || tournament.totalRounds == null) {
    return NextResponse.json({ error: "Tournament is not active" }, { status: 409 });
  }

  const finalRound = tournament.totalRounds - 1;
  const finalMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round: finalRound },
  });
  if (finalMatches.length !== 1 || !finalMatches[0].resolved) {
    return NextResponse.json({ error: "Final match not resolved yet" }, { status: 409 });
  }

  const finalMatch = finalMatches[0];
  const championId = finalMatch.winnerId!;
  const runnerUpId = championId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;

  const championShare = Math.floor((tournament.prizePool * CHAMPION_SHARE_PCT) / 100);
  const runnerUpShare = Math.floor((tournament.prizePool * RUNNER_UP_SHARE_PCT) / 100);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: championId },
      data: { creditBalance: { increment: championShare } },
    }),
    ...(runnerUpId
      ? [
          prisma.user.update({
            where: { id: runnerUpId },
            data: { creditBalance: { increment: runnerUpShare } },
          }),
        ]
      : []),
    prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        state: "COMPLETE",
        championId,
        runnerUpId,
        completedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ championId, runnerUpId });
}
