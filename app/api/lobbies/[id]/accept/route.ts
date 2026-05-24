import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { calculateAttributesFromContracts } from "@/app/utils/shipAttributesCalculator";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import type { GameDataView, ShipPosition } from "@/app/types/types";
import type { Address } from "viem";

// POST /api/lobbies/[id]/accept — both players have set their fleets; start the game
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const lobbyId = Number(id);
  if (isNaN(lobbyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { fleets: true },
  });
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lobby.creatorId !== userId && lobby.joinerId !== userId) {
    return NextResponse.json({ error: "Not a member of this lobby" }, { status: 403 });
  }
  if (!lobby.joinerId) return NextResponse.json({ error: "Waiting for joiner" }, { status: 409 });
  if (lobby.status === "IN_GAME") return NextResponse.json({ error: "Game already started" }, { status: 409 });

  const creatorFleet = lobby.fleets.find((f) => f.ownerId === lobby.creatorId);
  const joinerFleet  = lobby.fleets.find((f) => f.ownerId === lobby.joinerId!);
  if (!creatorFleet?.isComplete || !joinerFleet?.isComplete) {
    return NextResponse.json({ error: "Both players must submit their fleets first" }, { status: 409 });
  }

  // Load all ships
  const allShipIds = [...creatorFleet.shipIds, ...joinerFleet.shipIds];
  const dbShips = await prisma.ship.findMany({ where: { id: { in: allShipIds } } });
  const shipMap = new Map(dbShips.map((s) => [s.id, s]));

  // Build typed ship lists
  const creatorShips = creatorFleet.shipIds.map((id) => dbShipToShip(shipMap.get(id)!));
  const joinerShips  = joinerFleet.shipIds.map((id) => dbShipToShip(shipMap.get(id)!));
  const allShips     = [...creatorShips, ...joinerShips];

  // Attributes for every ship (indexed same order as allShips)
  const allAttributes = allShips.map(calculateAttributesFromContracts);

  // Starting positions — use stored positions or generate defaults
  const defaultPositions = (isCreator: boolean, count: number): Array<{ row: number; col: number }> => {
    const col = isCreator ? 0 : 16;
    return Array.from({ length: count }, (_, i) => ({ row: 1 + i * 2, col }));
  };

  const creatorPositions =
    (creatorFleet.startingPositions as Array<{ row: number; col: number }> | null) ??
    defaultPositions(true, creatorShips.length);
  const joinerPositions =
    (joinerFleet.startingPositions as Array<{ row: number; col: number }> | null) ??
    defaultPositions(false, joinerShips.length);

  const shipPositions: ShipPosition[] = [
    ...creatorShips.map((ship, i) => ({
      shipId: ship.id,
      position: creatorPositions[i] ?? { row: i, col: 0 },
      isCreator: true,
      status: 0 as const,
    })),
    ...joinerShips.map((ship, i) => ({
      shipId: ship.id,
      position: joinerPositions[i] ?? { row: i, col: 16 },
      isCreator: false,
      status: 0 as const,
    })),
  ];

  const now = BigInt(Date.now());
  const creatorGoesFirst = lobby.creatorGoesFirst ?? true;
  const firstTurnPlayerId = creatorGoesFirst ? lobby.creatorId : lobby.joinerId!;

  const gameId = lobbyId; // use lobbyId as gameId for simplicity (unique since lobby is unique per game)

  const gameState: GameDataView = {
    metadata: {
      gameId:          BigInt(gameId),
      lobbyId:         BigInt(lobbyId),
      creator:         lobby.creatorId as Address,
      joiner:          lobby.joinerId  as Address,
      creatorFleetId:  BigInt(creatorFleet.id),
      joinerFleetId:   BigInt(joinerFleet.id),
      creatorGoesFirst,
      startedAt:       now,
      winner:          "0x0000000000000000000000000000000000000000" as Address,
    },
    turnState: {
      currentTurn:    firstTurnPlayerId as Address,
      turnTime:       BigInt(lobby.turnTimeSeconds),
      turnStartTime:  now,
      currentRound:   1n,
    },
    gridDimensions: { gridWidth: 17, gridHeight: 11 },
    maxScore:    BigInt(lobby.maxScore),
    creatorScore: 0n,
    joinerScore:  0n,
    shipIds:        allShips.map((s) => s.id),
    shipAttributes: allAttributes,
    shipPositions,
    creatorActiveShipIds: creatorShips.map((s) => s.id),
    joinerActiveShipIds:  joinerShips.map((s) => s.id),
    creatorMovedShipIds:  [],
    joinerMovedShipIds:   [],
  };

  // Persist the game
  const game = await prisma.$transaction(async (tx) => {
    const g = await tx.game.create({
      data: {
        id: gameId,
        lobbyId,
        player1Id: lobby.creatorId,
        player2Id: lobby.joinerId!,
        state: JSON.parse(stringifyWithBigint(gameState)),
        currentTurn: firstTurnPlayerId,
        currentRound: 1,
        phase: "ACTIVE",
      },
    });
    await tx.lobby.update({ where: { id: lobbyId }, data: { status: "IN_GAME" } });
    return g;
  });

  return new NextResponse(
    stringifyWithBigint({ gameId: game.id }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
}
