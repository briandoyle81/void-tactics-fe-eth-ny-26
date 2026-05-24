import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// DELETE /api/lobbies/[id] — leave lobby
export async function DELETE(
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

  if (lobby.creatorId === userId) {
    // Creator leaving cancels the lobby
    await prisma.lobby.update({ where: { id: lobbyId }, data: { status: "CANCELLED" } });
  } else if (lobby.joinerId === userId) {
    // Joiner leaving resets the lobby to open
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: { joinerId: null, status: "OPEN", joinedAt: null },
    });
  } else {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
