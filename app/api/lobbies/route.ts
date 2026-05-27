import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { Lobby, LobbyStatus } from "@/app/types/types";
import { getEconomyConfig } from "@/app/lib/economyConfig";

function dbLobbyToLobby(db: {
  id: number;
  creatorId: string;
  joinerId: string | null;
  reservedJoinerId?: string | null;
  mapId: number | null;
  status: string;
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean | null;
  createdAt: Date;
  joinedAt: Date | null;
  joinerFleetSetAt?: Date | null;
  fleets?: { id: number; ownerId: string; isComplete: boolean }[];
}): Lobby {
  const statusMap: Record<string, LobbyStatus> = {
    OPEN: LobbyStatus.Open,
    FLEET_SELECTION: LobbyStatus.FleetSelection,
    IN_GAME: LobbyStatus.InGame,
    CANCELLED: LobbyStatus.Open,
    COMPLETED: LobbyStatus.InGame,
  };
  return {
    basic: {
      id: db.id,
      creator: db.creatorId as `0x${string}`,
      costLimit: db.costLimit,
      createdAt: db.createdAt.getTime(),
    },
    players: {
      joiner: (db.joinerId ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      reservedJoiner: (db.reservedJoinerId ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      creatorFleetId: db.fleets?.find((f) => f.ownerId === db.creatorId && f.isComplete)?.id ?? 0,
      joinerFleetId: db.joinerId
        ? (db.fleets?.find((f) => f.ownerId === db.joinerId && f.isComplete)?.id ?? 0)
        : 0,
      joinedAt: db.joinedAt ? db.joinedAt.getTime() : 0,
      joinerFleetSetAt: db.joinerFleetSetAt ? db.joinerFleetSetAt.getTime() : 0,
    },
    gameConfig: {
      creatorGoesFirst: db.creatorGoesFirst ?? true,
      turnTime: db.turnTimeSeconds,
      selectedMapId: db.mapId ?? 0,
      maxScore: db.maxScore,
    },
    state: {
      status: statusMap[db.status] ?? LobbyStatus.Open,
      gameStartedAt: 0,
    },
  };
}

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const lobbies = await prisma.lobby.findMany({
    where: {
      OR: [
        { status: "OPEN" },
        { creatorId: userId!, status: { in: ["OPEN", "FLEET_SELECTION"] } },
        { joinerId: userId!, status: { in: ["OPEN", "FLEET_SELECTION"] } },
        { reservedJoinerId: userId!, status: "OPEN" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { fleets: { select: { id: true, ownerId: true, isComplete: true } } },
  });

  return new NextResponse(stringifyWithBigint(lobbies.map(dbLobbyToLobby)), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const {
    costLimit = 0,
    turnTimeSeconds = 120,
    creatorGoesFirst = true,
    selectedMapId = null,
    maxScore = 3,
  } = body;

  const [economy, user] = await Promise.all([
    getEconomyConfig(),
    prisma.user.findUnique({ where: { id: userId! } }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Enforce kick timeout
  if (user.kickTimeoutUntil && user.kickTimeoutUntil > new Date()) {
    return NextResponse.json(
      { error: "You are temporarily blocked from creating lobbies due to a timeout penalty", kickTimeoutUntil: user.kickTimeoutUntil.toISOString() },
      { status: 403 },
    );
  }

  const isFreeCreate = user.lobbiesCreatedCount < economy.freeGamesPerAddress;
  if (!isFreeCreate && user.creditBalance < economy.lobbyCreationCostUtc) {
    return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
  }

  const [, lobby] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId! },
      data: {
        lobbiesCreatedCount: { increment: 1 },
        ...(isFreeCreate ? {} : { creditBalance: { decrement: economy.lobbyCreationCostUtc } }),
      },
    }),
    prisma.lobby.create({
      data: {
        creatorId: userId!,
        costLimit: Number(costLimit),
        turnTimeSeconds: Number(turnTimeSeconds),
        creatorGoesFirst: Boolean(creatorGoesFirst),
        mapId: selectedMapId ? Number(selectedMapId) : null,
        maxScore: Number(maxScore),
        status: "OPEN",
      },
    }),
  ]);

  return new NextResponse(stringifyWithBigint(dbLobbyToLobby(lobby)), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
