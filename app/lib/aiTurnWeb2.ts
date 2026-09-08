import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import { getMapTiles } from "./getMapTiles";
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
import { applyGameAction, GameActionError, GameActionInput } from "./gameEngineWeb2";
import { decideAIMove } from "./aiBehaviorWeb2";
import { ActionType, Archetype, ScoringPosition } from "../types/types";
import type { Web2GameDataView } from "../types/web2Game";
import { GamePhase } from "../generated/prisma";

export class AiTurnError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AiTurnResult {
  state: Web2GameDataView;
  shipId: number;
  actionType: ActionType;
  targetShipId: number;
}

// Same shape as SinglePlayerMatch._findUnmovedShip — first unmoved ship in
// active-id order, no HP filtering (a disabled ship can still act; the
// decision engine just tends to have it Pass).
function findUnmovedAiShip(state: Web2GameDataView): number | null {
  for (const shipId of state.joinerActiveShipIds) {
    if (!state.joinerMovedShipIds.includes(shipId)) return shipId;
  }
  return null;
}

/**
 * Takes one AI ship's turn — the web2 counterpart to
 * SinglePlayerMatch.takeAITurn. Moves exactly one AI ship per call; the
 * client re-calls this while it's still the AI's turn (see
 * useAITurnLoopWeb2.ts), mirroring the on-chain one-call-per-ship pattern.
 */
export async function takeAiTurn(gameId: number): Promise<AiTurnResult> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { lobby: true } });
  if (!game) throw new AiTurnError(404, "Game not found");
  if (game.phase !== GamePhase.ACTIVE) throw new AiTurnError(409, "Game not active");

  const state = game.state as unknown as Web2GameDataView;
  if (state.turnState.currentTurn !== AI_USER_ID) {
    throw new AiTurnError(409, "Not the AI's turn");
  }

  const shipId = findUnmovedAiShip(state);
  if (shipId === null) {
    throw new AiTurnError(409, "No unmoved AI ship — turn should have already passed");
  }

  const fleetShip = await prisma.aIFleetShip.findUnique({ where: { shipId } });
  const archetype: Archetype = fleetShip?.archetype ?? Archetype.Grunt;

  const dbShip = await prisma.ship.findUnique({ where: { id: shipId }, select: { equipment: true } });
  const hasRepairDrones = (dbShip?.equipment as { special?: number } | null)?.special === 2;

  const mapId = state.mapId || game.lobby.mapId || 0;
  const mapData = mapId ? await getMapTiles(mapId) : null;
  const scoringPositions = mapData ? (mapData.scoringTiles as unknown as ScoringPosition[]) : [];
  const { blockedGrid } = buildMapGridsFromContractMap(
    mapData ? (mapData.blockedTiles as unknown as Array<{ row: number; col: number }>) : [],
    scoringPositions,
    state.gridDimensions.gridWidth,
    state.gridDimensions.gridHeight,
  );

  const decision = decideAIMove({
    g: state,
    blockedGrid,
    scoringPositions,
    shipId,
    archetype,
    isCreatorSide: false, // AI is always the joiner (see aiFleetWeb2.ts / vs-ai lobby creation)
    hasRepairDrones,
  });

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  const fallbackInput: GameActionInput = {
    shipId,
    row: shipPos?.position.row ?? 0,
    col: shipPos?.position.col ?? 0,
    actionType: ActionType.Pass,
    targetShipId: 0,
  };

  const input: GameActionInput = decision
    ? {
        shipId: decision.shipId,
        row: decision.row,
        col: decision.col,
        actionType: decision.actionType,
        targetShipId: decision.targetShipId,
        specialType: decision.specialType,
      }
    : fallbackInput;

  try {
    const newState = await applyGameAction(gameId, AI_USER_ID, input);
    return { state: newState, shipId, actionType: input.actionType, targetShipId: input.targetShipId };
  } catch (err) {
    // Defense in depth, mirrors SinglePlayerMatch._takeShipTurn's try/catch:
    // an illegal decision degrades to "this ship Passes," not a hard failure.
    if (err instanceof GameActionError) {
      const newState = await applyGameAction(gameId, AI_USER_ID, fallbackInput);
      return { state: newState, shipId, actionType: ActionType.Pass, targetShipId: 0 };
    }
    throw err;
  }
}
