import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getLobbySettings } from "@/app/lib/lobbySettings";

// POST /api/lobbies/[id]/prune — web2 counterpart to Lobbies.sol's
// pruneStaleLobby. Permissionless on-chain (any wallet can call it once the
// staleness window has passed) — mirrored here as "any signed-in user",
// matching this app's usual auth floor for mutations. On-chain, pruning
// removes the lobby from the enumerable open-lobbies array while the lobby
// struct itself survives (still joinable by id) — a gas-bounding concern
// that doesn't apply to a SQL-backed list, so the meaningful web2 analog is
// the actual outcome players care about: an abandoned open lobby stops
// cluttering the browse list and frees its creator's one-active-lobby slot.
// Same effect as the creator leaving their own open lobby (see
// DELETE /api/lobbies/[id]), just triggerable by anyone once stale.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.status !== "OPEN" || lobby.joinerId) {
    return NextResponse.json({ error: "Lobby is not open and unjoined" }, { status: 409 });
  }

  const { staleLobbyThresholdDays } = await getLobbySettings();
  const ageSeconds = (Date.now() - lobby.createdAt.getTime()) / 1000;
  if (ageSeconds < staleLobbyThresholdDays * 86400) {
    return NextResponse.json({ error: "Lobby is not stale yet" }, { status: 409 });
  }

  const fleets = await prisma.fleet.findMany({ where: { lobbyId } });
  const allShipIds = fleets.flatMap((f) => f.shipIds as number[]);
  await prisma.$transaction([
    prisma.lobby.update({ where: { id: lobbyId }, data: { status: "CANCELLED" } }),
    ...(allShipIds.length > 0
      ? [prisma.ship.updateMany({ where: { id: { in: allShipIds } }, data: { inFleet: false } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
