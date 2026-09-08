import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { maybeAdvanceRound } from "@/app/lib/tournamentBracket";

// Creator-only fallback (mirrors web3's admin "Resolve as Draw" — despite
// the label, Tournament.sol's resolveDraw doesn't void the match: it's a
// TEMPORARY deterministic tiebreak that awards the match to whichever
// player registered first, docs/tournament.md §O-8) for a stuck match —
// e.g. a player abandons without triggering flee/timeout.
// Body: { winnerId?: string } — when omitted, auto-resolves to whichever of
// the match's two players registered for the tournament earlier, matching
// web3's actual behavior; when provided, must be one of the match's two
// players (a web2-only superset letting the creator override the tiebreak).
export async function POST(
  req: NextRequest,
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

  const body = await req.json().catch(() => ({}));
  let { winnerId }: { winnerId?: string } = body;

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: "Only the tournament creator can do this" }, { status: 403 });
  }

  const match = await prisma.tournamentMatch.findUnique({ where: { id: mId } });
  if (!match || match.tournamentId !== tournamentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (match.resolved) {
    return NextResponse.json({ error: "Match already resolved" }, { status: 409 });
  }
  if (!match.player1Id || !match.player2Id) {
    return NextResponse.json({ error: "Match is missing a player" }, { status: 409 });
  }

  if (!winnerId) {
    const registrants = await prisma.tournamentRegistrant.findMany({
      where: { tournamentId, userId: { in: [match.player1Id, match.player2Id] } },
      orderBy: { registeredAt: "asc" },
    });
    if (registrants.length === 0) {
      return NextResponse.json({ error: "No registration record for either player" }, { status: 409 });
    }
    winnerId = registrants[0].userId;
  }
  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    return NextResponse.json({ error: "winnerId must be one of the match's players" }, { status: 400 });
  }
  // This is a fallback for a match stuck after real play started (e.g. a
  // player abandons without triggering flee/timeout) — not a way to declare
  // a winner without a game ever happening. Require a lobby (and therefore a
  // game) to have actually been created for this match first.
  if (!match.lobbyId) {
    return NextResponse.json(
      { error: "Cannot resolve a match before its lobby/game has been created" },
      { status: 409 },
    );
  }

  await prisma.tournamentMatch.update({
    where: { id: mId },
    data: { winnerId, resolved: true },
  });

  await maybeAdvanceRound(tournamentId, match.round);

  return NextResponse.json({ resolved: true });
}
