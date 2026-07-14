import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateBracket } from "@/app/lib/tournamentBracket";

// Permissionless, like web3's start() — any registrant or the creator may
// trigger bracket generation once the roster is full or the deadline has
// passed with enough players registered.
export async function POST(
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
    include: { _count: { select: { registrants: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.state !== "REGISTRATION") {
    return NextResponse.json({ error: "Tournament already started" }, { status: 409 });
  }

  const isCreator = tournament.creatorId === userId;
  const isRegistrant = await prisma.tournamentRegistrant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: userId! } },
  });
  if (!isCreator && !isRegistrant) {
    return NextResponse.json({ error: "Not a participant in this tournament" }, { status: 403 });
  }

  const registrantCount = tournament._count.registrants;
  const isFull = registrantCount >= tournament.maxPlayers;
  const deadlinePassed = tournament.registerBy.getTime() <= Date.now();
  if (!isFull && !(deadlinePassed && registrantCount >= tournament.minPlayers)) {
    return NextResponse.json({ error: "StartConditionsNotMet" }, { status: 409 });
  }

  await generateBracket(tournamentId);

  return NextResponse.json({ started: true });
}
