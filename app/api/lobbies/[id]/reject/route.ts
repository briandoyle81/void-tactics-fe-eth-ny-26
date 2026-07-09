import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// POST /api/lobbies/[id]/reject
// reservedJoiner calls this to decline a pre-set private lobby invitation.
// Clears reservedJoinerId so the lobby becomes open to anyone.
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
  if (lobby.status !== "OPEN") return NextResponse.json({ error: "Lobby must be open" }, { status: 409 });
  if (!lobby.reservedJoinerId) return NextResponse.json({ error: "Lobby is not reserved" }, { status: 409 });
  if (lobby.reservedJoinerId !== userId) return NextResponse.json({ error: "You are not the reserved joiner" }, { status: 403 });

  await prisma.lobby.update({
    where: { id: lobbyId },
    data: { reservedJoinerId: null },
  });

  return NextResponse.json({ ok: true });
}
