import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { MAP_ADMIN_EMAILS } from "@/app/config/alpha";

// POST /api/admin/lobbies — createLobbyForAddresses (owner-only)
// Creates a FleetSelection lobby with both players pre-set.
// Body: { creatorEmail, joinerEmail, costLimit?, turnTimeSeconds?, maxScore?, mapId? }
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const caller = await prisma.user.findUnique({ where: { id: userId! } });
  if (!caller || !MAP_ADMIN_EMAILS.includes(caller.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    creatorEmail,
    joinerEmail,
    costLimit = 0,
    turnTimeSeconds = 120,
    maxScore = 3,
    mapId = null,
    creatorGoesFirst = true,
  } = body as {
    creatorEmail: string;
    joinerEmail: string;
    costLimit?: number;
    turnTimeSeconds?: number;
    maxScore?: number;
    mapId?: number | null;
    creatorGoesFirst?: boolean;
  };

  if (!creatorEmail || !joinerEmail) {
    return NextResponse.json({ error: "creatorEmail and joinerEmail are required" }, { status: 400 });
  }
  if (creatorEmail === joinerEmail) {
    return NextResponse.json({ error: "Creator and joiner must be different players" }, { status: 400 });
  }

  const [creator, joiner] = await Promise.all([
    prisma.user.findUnique({ where: { email: creatorEmail } }),
    prisma.user.findUnique({ where: { email: joinerEmail } }),
  ]);

  if (!creator) return NextResponse.json({ error: `No user found with email: ${creatorEmail}` }, { status: 404 });
  if (!joiner) return NextResponse.json({ error: `No user found with email: ${joinerEmail}` }, { status: 404 });

  const lobby = await prisma.lobby.create({
    data: {
      creatorId: creator.id,
      joinerId: joiner.id,
      reservedJoinerId: null,
      costLimit: Number(costLimit),
      turnTimeSeconds: Number(turnTimeSeconds),
      creatorGoesFirst: Boolean(creatorGoesFirst),
      mapId: mapId ? Number(mapId) : null,
      maxScore: Number(maxScore),
      status: "FLEET_SELECTION",
      joinedAt: new Date(),
    },
  });

  return NextResponse.json({ id: lobby.id, creatorId: creator.id, joinerId: joiner.id }, { status: 201 });
}
