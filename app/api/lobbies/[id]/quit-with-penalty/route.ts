import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

const KICK_PENALTY_SECONDS = 3600; // 1 hour per kick count
const MIN_TIMEOUT_SECONDS = 300;   // 5 minutes minimum

// POST /api/lobbies/[id]/quit-with-penalty
// Joiner calls this when the creator has not submitted their fleet within turnTimeSeconds
// of the joiner submitting theirs.
// Penalizes the creator: kickCount++, kickTimeoutUntil = now + kickCount * 3600s.
// Joiner leaves and lobby is cancelled (creator kept the lobby open too long without acting).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.joinerId !== userId) return NextResponse.json({ error: "Only the joiner can quit with penalty" }, { status: 403 });
  if (lobby.status !== "FLEET_SELECTION") return NextResponse.json({ error: "Lobby must be in fleet selection" }, { status: 409 });

  // Joiner must have submitted their fleet
  if (!lobby.joinerFleetSetAt) {
    return NextResponse.json({ error: "You must submit your fleet before quitting with penalty" }, { status: 409 });
  }

  // Creator must not have submitted their fleet yet
  const creatorFleet = await prisma.fleet.findFirst({
    where: { lobbyId, ownerId: lobby.creatorId, isComplete: true },
  });
  if (creatorFleet) return NextResponse.json({ error: "Creator has already submitted their fleet" }, { status: 409 });

  // turnTimeSeconds must have elapsed since joiner submitted their fleet
  const elapsedSeconds = (Date.now() - lobby.joinerFleetSetAt.getTime()) / 1000;
  if (elapsedSeconds < lobby.turnTimeSeconds) {
    return NextResponse.json(
      { error: "Turn time has not elapsed yet", remainingSeconds: Math.ceil(lobby.turnTimeSeconds - elapsedSeconds) },
      { status: 409 },
    );
  }

  const creator = await prisma.user.findUnique({ where: { id: lobby.creatorId } });
  if (!creator) return NextResponse.json({ error: "Creator user not found" }, { status: 404 });

  const newKickCount = creator.kickCount + 1;
  const penaltySeconds = Math.max(MIN_TIMEOUT_SECONDS, newKickCount * KICK_PENALTY_SECONDS);
  const kickTimeoutUntil = new Date(Date.now() + penaltySeconds * 1000);

  // Free all fleet ships, cancel lobby, penalize creator
  const fleets = await prisma.fleet.findMany({ where: { lobbyId } });
  const allShipIds = fleets.flatMap((f) => f.shipIds as number[]);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: lobby.creatorId },
      data: { kickCount: newKickCount, kickTimeoutUntil },
    }),
    prisma.lobby.update({
      where: { id: lobbyId },
      data: { status: "CANCELLED" },
    }),
    ...(allShipIds.length > 0
      ? [prisma.ship.updateMany({ where: { id: { in: allShipIds } }, data: { inFleet: false } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
