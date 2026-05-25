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
    // Creator leaving cancels the lobby — free all fleet ships
    const fleets = await prisma.fleet.findMany({ where: { lobbyId } });
    const allShipIds = fleets.flatMap((f) => f.shipIds as number[]);
    await prisma.$transaction([
      prisma.lobby.update({ where: { id: lobbyId }, data: { status: "CANCELLED" } }),
      ...(allShipIds.length > 0
        ? [prisma.ship.updateMany({ where: { id: { in: allShipIds } }, data: { inFleet: false } })]
        : []),
    ]);
  } else if (lobby.joinerId === userId) {
    // Joiner leaving resets the lobby to open — free joiner's fleet ships
    const joinerFleet = await prisma.fleet.findFirst({ where: { lobbyId, ownerId: userId } });
    const joinerShipIds = (joinerFleet?.shipIds ?? []) as number[];
    await prisma.$transaction([
      prisma.lobby.update({
        where: { id: lobbyId },
        data: { joinerId: null, status: "OPEN", joinedAt: null },
      }),
      ...(joinerShipIds.length > 0
        ? [prisma.ship.updateMany({ where: { id: { in: joinerShipIds } }, data: { inFleet: false } })]
        : []),
    ]);
  } else {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
