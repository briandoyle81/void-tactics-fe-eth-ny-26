import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { Lobby, LobbyStatus } from "@/app/types/types";

function dbLobbyToLobby(db: {
  id: number;
  creatorId: string;
  joinerId: string | null;
  mapId: number | null;
  status: string;
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean | null;
  createdAt: Date;
  joinedAt: Date | null;
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
      id: BigInt(db.id),
      creator: db.creatorId as `0x${string}`,
      costLimit: BigInt(db.costLimit),
      createdAt: BigInt(db.createdAt.getTime()),
    },
    players: {
      joiner: (db.joinerId ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      reservedJoiner: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      creatorFleetId: 0n,
      joinerFleetId: 0n,
      joinedAt: db.joinedAt ? BigInt(db.joinedAt.getTime()) : 0n,
      joinerFleetSetAt: 0n,
    },
    gameConfig: {
      creatorGoesFirst: db.creatorGoesFirst ?? true,
      turnTime: BigInt(db.turnTimeSeconds),
      selectedMapId: BigInt(db.mapId ?? 0),
      maxScore: BigInt(db.maxScore),
    },
    state: {
      status: statusMap[db.status] ?? LobbyStatus.Open,
      gameStartedAt: 0n,
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
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
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

  const lobby = await prisma.lobby.create({
    data: {
      creatorId: userId!,
      costLimit: Number(costLimit),
      turnTimeSeconds: Number(turnTimeSeconds),
      creatorGoesFirst: Boolean(creatorGoesFirst),
      mapId: selectedMapId ? Number(selectedMapId) : null,
      maxScore: Number(maxScore),
      status: "OPEN",
    },
  });

  return new NextResponse(stringifyWithBigint(dbLobbyToLobby(lobby)), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
