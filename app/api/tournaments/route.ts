import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbTournamentToWeb2 } from "@/app/lib/dbToTournament";

const VALID_MAX_PLAYERS = [2, 4, 8, 16];

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { registrants: true } } },
    take: 100,
  });

  return NextResponse.json(
    tournaments.map((t) => dbTournamentToWeb2(t, t._count.registrants)),
  );
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const {
    entryFee = 0,
    minPlayers,
    maxPlayers,
    registerBy,
    costLimit,
    turnTimeSeconds,
    selectedMapId,
    maxScore,
  } = body;

  if (!VALID_MAX_PLAYERS.includes(maxPlayers)) {
    return NextResponse.json({ error: "maxPlayers must be one of 2, 4, 8, 16" }, { status: 400 });
  }
  if (!Number.isInteger(minPlayers) || minPlayers < 2 || minPlayers > maxPlayers) {
    return NextResponse.json({ error: "minPlayers must be between 2 and maxPlayers" }, { status: 400 });
  }
  if (!Number.isInteger(entryFee) || entryFee < 0) {
    return NextResponse.json({ error: "Invalid entryFee" }, { status: 400 });
  }
  const registerByDate = new Date(registerBy);
  if (isNaN(registerByDate.getTime()) || registerByDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "registerBy must be a future date" }, { status: 400 });
  }
  if (!Number.isInteger(turnTimeSeconds) || turnTimeSeconds < 60 || turnTimeSeconds > 86400) {
    return NextResponse.json({ error: "turnTimeSeconds must be between 60 and 86400" }, { status: 400 });
  }
  if (!Number.isInteger(maxScore) || maxScore < 50 || maxScore > 200) {
    return NextResponse.json({ error: "maxScore must be between 50 and 200" }, { status: 400 });
  }
  if (!Number.isInteger(costLimit) || costLimit < 0) {
    return NextResponse.json({ error: "Invalid costLimit" }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      creatorId: userId!,
      entryFee,
      minPlayers,
      maxPlayers,
      registerBy: registerByDate,
      costLimit,
      turnTimeSeconds,
      selectedMapId: Number.isInteger(selectedMapId) ? selectedMapId : 1,
      maxScore,
    },
  });

  return NextResponse.json(dbTournamentToWeb2(tournament, 0), { status: 201 });
}
