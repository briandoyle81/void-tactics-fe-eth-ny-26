import { prisma } from "./prisma";
import { dbShipToShip } from "./dbToType";
import { calculateAttributesFromContracts } from "../utils/shipAttributesCalculator";
import type { GameDataView, ShipPosition } from "../types/types";
import type { Address } from "viem";

type FleetWithShips = {
  id: number;
  ownerId: string;
  shipIds: number[];
  startingPositions: unknown;
  isComplete: boolean;
};

type LobbyForGame = {
  id: number;
  creatorId: string;
  joinerId: string;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean | null;
  mapId: number | null;
};

export async function createGameFromLobby(
  lobby: LobbyForGame,
  creatorFleet: FleetWithShips,
  joinerFleet: FleetWithShips,
): Promise<number> {
  const allShipIds = [...creatorFleet.shipIds, ...joinerFleet.shipIds];
  const dbShips = await prisma.ship.findMany({ where: { id: { in: allShipIds } } });
  const shipMap = new Map(dbShips.map((s) => [s.id, s]));

  const creatorShips = creatorFleet.shipIds.map((id) => dbShipToShip(shipMap.get(id)!));
  const joinerShips = joinerFleet.shipIds.map((id) => dbShipToShip(shipMap.get(id)!));
  const allShips = [...creatorShips, ...joinerShips];
  const allAttributes = allShips.map(calculateAttributesFromContracts);

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

  const now = Date.now();
  const creatorGoesFirst = lobby.creatorGoesFirst ?? true;
  const firstTurnPlayerId = creatorGoesFirst ? lobby.creatorId : lobby.joinerId;
  const gameId = lobby.id;

  const gameState: GameDataView = {
    metadata: {
      gameId,
      lobbyId:         lobby.id,
      creator:         lobby.creatorId as Address,
      joiner:          lobby.joinerId as Address,
      creatorFleetId:  creatorFleet.id,
      joinerFleetId:   joinerFleet.id,
      creatorGoesFirst,
      startedAt:       now,
      winner:          "0x0000000000000000000000000000000000000000" as Address,
    },
    turnState: {
      currentTurn:    firstTurnPlayerId as Address,
      turnTime:       lobby.turnTimeSeconds,
      turnStartTime:  now,
      currentRound:   1,
    },
    gridDimensions: { gridWidth: 17, gridHeight: 11 },
    mapId: lobby.mapId ?? 0,
    maxScore:    lobby.maxScore,
    creatorScore: 0,
    joinerScore:  0,
    shipIds:        allShips.map((s) => s.id),
    shipAttributes: allAttributes,
    shipPositions,
    creatorActiveShipIds: creatorShips.map((s) => s.id),
    joinerActiveShipIds:  joinerShips.map((s) => s.id),
    creatorMovedShipIds:  [],
    joinerMovedShipIds:   [],
  };

  await prisma.$transaction(async (tx) => {
    await tx.game.create({
      data: {
        id: gameId,
        lobbyId: lobby.id,
        player1Id: lobby.creatorId,
        player2Id: lobby.joinerId,
        state: gameState as object,
        currentTurn: firstTurnPlayerId,
        currentRound: 1,
        phase: "ACTIVE",
      },
    });
    await tx.lobby.update({ where: { id: lobby.id }, data: { status: "IN_GAME" } });
  });

  return gameId;
}
