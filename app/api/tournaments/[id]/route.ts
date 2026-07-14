import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbTournamentToWeb2 } from "@/app/lib/dbToTournament";
import type { Web2TournamentDetail } from "@/app/types/web2Tournament";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const tournamentId = Number(id);
  if (isNaN(tournamentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrants: { orderBy: { registeredAt: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { matchIndex: "asc" }] },
    },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { config, summary } = dbTournamentToWeb2(tournament, tournament.registrants.length);

  const detail: Web2TournamentDetail = {
    config,
    summary,
    registrants: tournament.registrants.map((r) => r.userId),
    isRegistered: tournament.registrants.some((r) => r.userId === userId),
    bracket: tournament.matches.map((m) => ({
      id: m.id,
      round: m.round,
      matchIndex: m.matchIndex,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      winnerId: m.winnerId,
      isBye: m.isBye,
      resolved: m.resolved,
      lobbyId: m.lobbyId,
    })),
  };

  return NextResponse.json(detail);
}
