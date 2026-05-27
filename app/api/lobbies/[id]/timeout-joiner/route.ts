import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

const KICK_PENALTY_SECONDS = 3600; // 1 hour per kick count
const MIN_TIMEOUT_SECONDS = 300;   // 5 minutes minimum

// POST /api/lobbies/[id]/timeout-joiner
// Creator calls this when joiner has not submitted their fleet within turnTimeSeconds of joining.
// Penalizes the joiner: kickCount++, kickTimeoutUntil = now + kickCount * 3600s.
// Resets lobby to OPEN.
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
  if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only the creator can timeout a joiner" }, { status: 403 });
  if (lobby.status !== "FLEET_SELECTION") return NextResponse.json({ error: "Lobby must be in fleet selection" }, { status: 409 });
  if (!lobby.joinerId) return NextResponse.json({ error: "No joiner to timeout" }, { status: 409 });

  // Joiner must not have submitted their fleet yet
  const joinerFleet = await prisma.fleet.findFirst({
    where: { lobbyId, ownerId: lobby.joinerId, isComplete: true },
  });
  if (joinerFleet) return NextResponse.json({ error: "Joiner has already submitted their fleet" }, { status: 409 });

  // turnTimeSeconds must have elapsed since joinedAt
  if (!lobby.joinedAt) return NextResponse.json({ error: "Missing join timestamp" }, { status: 500 });
  const elapsedSeconds = (Date.now() - lobby.joinedAt.getTime()) / 1000;
  if (elapsedSeconds < lobby.turnTimeSeconds) {
    return NextResponse.json(
      { error: "Turn time has not elapsed yet", remainingSeconds: Math.ceil(lobby.turnTimeSeconds - elapsedSeconds) },
      { status: 409 },
    );
  }

  const joinerId = lobby.joinerId;
  const joiner = await prisma.user.findUnique({ where: { id: joinerId } });
  if (!joiner) return NextResponse.json({ error: "Joiner user not found" }, { status: 404 });

  const newKickCount = joiner.kickCount + 1;
  const penaltySeconds = Math.max(MIN_TIMEOUT_SECONDS, newKickCount * KICK_PENALTY_SECONDS);
  const kickTimeoutUntil = new Date(Date.now() + penaltySeconds * 1000);

  // Free joiner's fleet ships, reset lobby to OPEN, penalize joiner
  const joinerFleetRecord = await prisma.fleet.findFirst({ where: { lobbyId, ownerId: joinerId } });
  const joinerShipIds = (joinerFleetRecord?.shipIds ?? []) as number[];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: joinerId },
      data: { kickCount: newKickCount, kickTimeoutUntil },
    }),
    prisma.lobby.update({
      where: { id: lobbyId },
      data: { joinerId: null, status: "OPEN", joinedAt: null, joinerFleetSetAt: null },
    }),
    ...(joinerShipIds.length > 0
      ? [prisma.ship.updateMany({ where: { id: { in: joinerShipIds } }, data: { inFleet: false } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, kickTimeoutUntil: kickTimeoutUntil.toISOString(), penaltySeconds });
}
