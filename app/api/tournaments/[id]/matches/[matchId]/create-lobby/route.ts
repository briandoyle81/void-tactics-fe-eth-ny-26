import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// Creator-only. Spins up a normal Lobby row with both players pre-assigned
// (creatorId + joinerId set at creation, status FLEET_SELECTION from the
// start) — skips the open/join step entirely, matching web3's
// `Lobbies.createLobbyForAddresses`. Everything downstream (fleet
// selection with starting positions, the Game itself) is the *existing*,
// unmodified Lobby/Fleet/Game pipeline.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, matchId } = await params;
  const tournamentId = Number(id);
  const mId = Number(matchId);
  if (isNaN(tournamentId) || isNaN(mId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: "Only the tournament creator can do this" }, { status: 403 });
  }

  const match = await prisma.tournamentMatch.findUnique({ where: { id: mId } });
  if (!match || match.tournamentId !== tournamentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!match.player1Id || !match.player2Id) {
    return NextResponse.json({ error: "Match is a bye or missing a player" }, { status: 409 });
  }
  if (match.lobbyId) {
    return NextResponse.json({ error: "Lobby already assigned" }, { status: 409 });
  }

  const lobby = await prisma.lobby.create({
    data: {
      creatorId: match.player1Id,
      joinerId: match.player2Id,
      status: "FLEET_SELECTION",
      costLimit: tournament.costLimit,
      turnTimeSeconds: tournament.turnTimeSeconds,
      maxScore: tournament.maxScore,
      mapId: tournament.selectedMapId,
      joinedAt: new Date(),
    },
  });

  await prisma.tournamentMatch.update({
    where: { id: mId },
    data: { lobbyId: lobby.id },
  });

  return NextResponse.json({ lobbyId: lobby.id }, { status: 201 });
}
