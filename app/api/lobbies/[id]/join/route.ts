import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [lobby, user] = await Promise.all([
    prisma.lobby.findUnique({ where: { id: lobbyId } }),
    prisma.user.findUnique({ where: { id: userId! } }),
  ]);
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (lobby.status !== "OPEN") return NextResponse.json({ error: "Lobby not open" }, { status: 409 });
  if (lobby.creatorId === userId) return NextResponse.json({ error: "Cannot join your own lobby" }, { status: 409 });
  if (lobby.joinerId) return NextResponse.json({ error: "Lobby already has a joiner" }, { status: 409 });

  // Enforce kick timeout
  if (user.kickTimeoutUntil && user.kickTimeoutUntil > new Date()) {
    return NextResponse.json(
      { error: "You are temporarily blocked from joining lobbies due to a timeout penalty", kickTimeoutUntil: user.kickTimeoutUntil.toISOString() },
      { status: 403 },
    );
  }

  // Enforce reserved joiner
  if (lobby.reservedJoinerId && lobby.reservedJoinerId !== userId) {
    return NextResponse.json({ error: "NotReservedJoiner" }, { status: 403 });
  }

  const updated = await prisma.lobby.update({
    where: { id: lobbyId },
    data: { joinerId: userId, status: "FLEET_SELECTION", joinedAt: new Date() },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
