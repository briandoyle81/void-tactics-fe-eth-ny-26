import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { parseWithBigint, stringifyWithBigint } from "@/app/lib/bigintJson";
import { ActionType } from "@/app/types/types";
import type { GameDataView, LastMove } from "@/app/types/types";
import type { Address } from "viem";
import { buildMapGridsFromContractMap } from "@/app/utils/mapGridUtils";

interface ActionBody {
  shipId: bigint;
  row: number;
  col: number;
  actionType: number;
  targetShipId: bigint;
  specialType?: number; // required for Special actions
}

// Special ability config (mirrors contract ShipAttributes v1 specials)
const SPECIAL_CONFIG: Record<number, { range: number; strength: number }> = {
  1: { range: 3, strength: 0 },  // EMP: no HP damage, adds status effect
  2: { range: 2, strength: 30 }, // Repair: heals 30 HP
  3: { range: 3, strength: 50 }, // Flak: deals 50 damage, ignores LOS
};

function applyShootDamage(
  state: GameDataView,
  attackerShipId: bigint,
  targetShipId: bigint,
): GameDataView {
  const attackerIdx = state.shipIds.findIndex((id) => id === attackerShipId);
  const targetIdx = state.shipIds.findIndex((id) => id === targetShipId);
  if (attackerIdx === -1 || targetIdx === -1) return state;

  const newAttrs = [...state.shipAttributes];
  const attackerAttrs = newAttrs[attackerIdx]!;
  const targetAttrs = { ...newAttrs[targetIdx]! };

  if (targetAttrs.hullPoints > 0) {
    const baseDamage = attackerAttrs.gunDamage;
    const reduction = targetAttrs.damageReduction;
    const damage = Math.max(1, baseDamage - Math.floor((baseDamage * reduction) / 100));
    targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - damage);
  }

  // Reactor critical: set timer to 3, then immediately clear and destroy
  if (targetAttrs.hullPoints === 0 && targetAttrs.reactorCriticalTimer === 0) {
    targetAttrs.reactorCriticalTimer = 3;
  }
  if (targetAttrs.hullPoints === 0 && targetAttrs.reactorCriticalTimer > 0) {
    targetAttrs.reactorCriticalTimer = 0;
  }

  newAttrs[targetIdx] = targetAttrs;

  let newCreatorActive = [...state.creatorActiveShipIds];
  let newJoinerActive = [...state.joinerActiveShipIds];
  if (targetAttrs.reactorCriticalTimer === 0 && targetAttrs.hullPoints === 0) {
    newCreatorActive = newCreatorActive.filter((id) => id !== targetShipId);
    newJoinerActive = newJoinerActive.filter((id) => id !== targetShipId);
  }

  return { ...state, shipAttributes: newAttrs, creatorActiveShipIds: newCreatorActive, joinerActiveShipIds: newJoinerActive };
}

function checkWinConditions(state: GameDataView): { winner: string | null; reason: string | null } {
  if (state.creatorActiveShipIds.length === 0) {
    return { winner: state.metadata.joiner as string, reason: "all_destroyed" };
  }
  if (state.joinerActiveShipIds.length === 0) {
    return { winner: state.metadata.creator as string, reason: "all_destroyed" };
  }
  if (state.creatorScore >= state.maxScore) {
    return { winner: state.metadata.creator as string, reason: "score" };
  }
  if (state.joinerScore >= state.maxScore) {
    return { winner: state.metadata.joiner as string, reason: "score" };
  }
  return { winner: null, reason: null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const gameId = Number(id);
  if (isNaN(gameId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: ActionBody;
  try {
    const bodyText = await req.text();
    body = parseWithBigint<ActionBody>(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shipId, row, col, actionType, targetShipId } = body;
  const specialType = body.specialType ?? 0;

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      OR: [{ player1Id: userId! }, { player2Id: userId! }],
    },
    include: { lobby: { include: { map: true } } },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.phase !== "ACTIVE") return NextResponse.json({ error: "Game not active" }, { status: 409 });

  const state = parseWithBigint<GameDataView>(JSON.stringify(game.state));

  if (String(state.turnState.currentTurn) !== userId!) {
    return NextResponse.json({ error: "Not your turn" }, { status: 409 });
  }

  const isCreator = String(state.metadata.creator) === userId!;
  const myActiveShipIds = isCreator ? state.creatorActiveShipIds : state.joinerActiveShipIds;
  const myMovedShipIds = isCreator ? state.creatorMovedShipIds : state.joinerMovedShipIds;

  if (!myActiveShipIds.some((id) => id === shipId)) {
    return NextResponse.json({ error: "Ship not active or not yours" }, { status: 400 });
  }

  const isRetreating = actionType === ActionType.Retreat;
  if (!isRetreating && myMovedShipIds.some((id) => id === shipId)) {
    return NextResponse.json({ error: "Ship already moved this round" }, { status: 409 });
  }

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) return NextResponse.json({ error: "Ship position not found" }, { status: 400 });

  // Build map grids for scoring at round end
  const mapData = game.lobby.map;
  const { scoringGrid } = buildMapGridsFromContractMap(
    mapData ? (mapData.blockedTiles as Array<{ row: number; col: number }>) : [],
    mapData ? (mapData.scoringTiles as Array<{ row: number; col: number; points: number; onlyOnce: boolean }>) : [],
    state.gridDimensions.gridWidth,
    state.gridDimensions.gridHeight,
  );

  const now = BigInt(Date.now());
  let newState: GameDataView = {
    ...state,
    shipPositions: [...state.shipPositions],
    shipAttributes: [...state.shipAttributes],
    creatorActiveShipIds: [...state.creatorActiveShipIds],
    joinerActiveShipIds: [...state.joinerActiveShipIds],
    creatorMovedShipIds: [...state.creatorMovedShipIds],
    joinerMovedShipIds: [...state.joinerMovedShipIds],
  };

  const moveShipTo = (sid: bigint, newRow: number, newCol: number) => {
    const posIdx = newState.shipPositions.findIndex((p) => p.shipId === sid);
    if (posIdx === -1) return;
    const newPositions = [...newState.shipPositions];
    newPositions[posIdx] = { ...newPositions[posIdx]!, position: { row: newRow, col: newCol } };
    newState = { ...newState, shipPositions: newPositions };
  };

  const oldRow = shipPos.position.row;
  const oldCol = shipPos.position.col;

  let lastMove: LastMove;

  switch (actionType) {
    case ActionType.Pass:
    case ActionType.ClaimPoints: {
      moveShipTo(shipId, row, col);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Pass, targetShipId: 0n, timestamp: now };
      break;
    }

    case ActionType.Shoot: {
      if (!targetShipId || targetShipId === 0n) {
        return NextResponse.json({ error: "Target required for shoot" }, { status: 400 });
      }
      moveShipTo(shipId, row, col);
      newState = applyShootDamage(newState, shipId, targetShipId);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Shoot, targetShipId, timestamp: now };
      break;
    }

    case ActionType.Special: {
      if (!targetShipId && specialType !== 3) {
        return NextResponse.json({ error: "Target required for special" }, { status: 400 });
      }
      moveShipTo(shipId, row, col);

      if (specialType === 1) {
        // EMP: add status effect to target
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        if (targetIdx !== -1) {
          const newAttrs = [...newState.shipAttributes];
          const targetAttrs = { ...newAttrs[targetIdx]! };
          targetAttrs.statusEffects = [...(targetAttrs.statusEffects ?? []), 1];
          newAttrs[targetIdx] = targetAttrs;
          newState = { ...newState, shipAttributes: newAttrs };
        }
      } else if (specialType === 2) {
        // Repair: heal target
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        if (targetIdx !== -1) {
          const newAttrs = [...newState.shipAttributes];
          const targetAttrs = { ...newAttrs[targetIdx]! };
          const healAmount = SPECIAL_CONFIG[2]!.strength;
          targetAttrs.hullPoints = Math.min(targetAttrs.maxHullPoints, targetAttrs.hullPoints + healAmount);
          targetAttrs.reactorCriticalTimer = 0;
          newAttrs[targetIdx] = targetAttrs;
          newState = { ...newState, shipAttributes: newAttrs };
        }
      } else if (specialType === 3) {
        // Flak: deal gun damage, no LOS check
        if (targetShipId && targetShipId !== 0n) {
          newState = applyShootDamage(newState, shipId, targetShipId);
        }
      }

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Special, targetShipId: targetShipId ?? 0n, timestamp: now };
      break;
    }

    case ActionType.Assist: {
      if (!targetShipId || targetShipId === 0n) {
        return NextResponse.json({ error: "Target required for assist" }, { status: 400 });
      }
      moveShipTo(shipId, row, col);
      const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
      if (targetIdx !== -1) {
        const newAttrs = [...newState.shipAttributes];
        const targetAttrs = { ...newAttrs[targetIdx]! };
        targetAttrs.hullPoints = Math.min(targetAttrs.maxHullPoints, targetAttrs.hullPoints + 20);
        targetAttrs.reactorCriticalTimer = 0;
        newAttrs[targetIdx] = targetAttrs;
        newState = { ...newState, shipAttributes: newAttrs };
      }
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Assist, targetShipId, timestamp: now };
      break;
    }

    case ActionType.Retreat: {
      newState = {
        ...newState,
        shipPositions: newState.shipPositions.filter((p) => p.shipId !== shipId),
        creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== shipId),
        joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== shipId),
      };
      lastMove = { shipId, oldRow, oldCol, newRow: -1, newCol: -1, actionType: ActionType.Retreat, targetShipId: 0n, timestamp: now };
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  }

  newState = { ...newState, lastMove };

  // Mark ship as moved
  if (isCreator) {
    if (!newState.creatorMovedShipIds.some((id) => id === shipId)) {
      newState = { ...newState, creatorMovedShipIds: [...newState.creatorMovedShipIds, shipId] };
    }
  } else {
    if (!newState.joinerMovedShipIds.some((id) => id === shipId)) {
      newState = { ...newState, joinerMovedShipIds: [...newState.joinerMovedShipIds, shipId] };
    }
  }

  // Check early win condition (all enemy ships destroyed)
  const earlyWin = checkWinConditions(newState);
  let gamePhase: string = game.phase;
  let winnerId: string | null = game.winnerId;

  if (earlyWin.winner) {
    gamePhase = "COMPLETED";
    winnerId = earlyWin.winner;
    newState = {
      ...newState,
      metadata: { ...newState.metadata, winner: earlyWin.winner as Address },
    };
  } else {
    // Turn advancement
    const allCreatorMoved = newState.creatorActiveShipIds.every((id) =>
      newState.creatorMovedShipIds.some((mid) => mid === id),
    );
    const allJoinerMoved = newState.joinerActiveShipIds.every((id) =>
      newState.joinerMovedShipIds.some((mid) => mid === id),
    );

    if (allCreatorMoved && allJoinerMoved) {
      // Round end: award scoring points
      for (const pos of newState.shipPositions) {
        const pts = scoringGrid[pos.position.row]?.[pos.position.col] ?? 0;
        if (pts > 0) {
          if (newState.creatorActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, creatorScore: newState.creatorScore + BigInt(pts) };
          } else if (newState.joinerActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, joinerScore: newState.joinerScore + BigInt(pts) };
          }
        }
      }

      const roundEndWin = checkWinConditions(newState);
      if (roundEndWin.winner) {
        gamePhase = "COMPLETED";
        winnerId = roundEndWin.winner;
        newState = {
          ...newState,
          metadata: { ...newState.metadata, winner: roundEndWin.winner as Address },
        };
      } else {
        // Start next round
        const firstPlayerNextRound = newState.metadata.creatorGoesFirst
          ? newState.metadata.creator
          : newState.metadata.joiner;
        newState = {
          ...newState,
          creatorMovedShipIds: [],
          joinerMovedShipIds: [],
          turnState: {
            ...newState.turnState,
            currentRound: newState.turnState.currentRound + 1n,
            currentTurn: firstPlayerNextRound,
            turnStartTime: BigInt(Date.now()),
          },
        };
      }
    } else if (isCreator && allCreatorMoved) {
      // Creator done, switch to joiner
      newState = {
        ...newState,
        turnState: { ...newState.turnState, currentTurn: newState.metadata.joiner, turnStartTime: BigInt(Date.now()) },
      };
    } else if (!isCreator && allJoinerMoved) {
      // Joiner done, switch to creator
      newState = {
        ...newState,
        turnState: { ...newState.turnState, currentTurn: newState.metadata.creator, turnStartTime: BigInt(Date.now()) },
      };
    }
  }

  // Persist
  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: {
        state: JSON.parse(stringifyWithBigint(newState)),
        currentTurn: String(newState.turnState.currentTurn),
        currentRound: Number(newState.turnState.currentRound),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phase: gamePhase as any,
        winnerId,
      },
    });

    if (gamePhase === "COMPLETED" && winnerId && winnerId !== game.winnerId) {
      const loserId = winnerId === game.player1Id ? game.player2Id : game.player1Id;
      await tx.playerStats.upsert({
        where: { userId: winnerId },
        update: { wins: { increment: 1 }, totalGames: { increment: 1 } },
        create: { userId: winnerId, wins: 1, totalGames: 1 },
      });
      await tx.playerStats.upsert({
        where: { userId: loserId },
        update: { losses: { increment: 1 }, totalGames: { increment: 1 } },
        create: { userId: loserId, losses: 1, totalGames: 1 },
      });
    }
  });

  return new NextResponse(stringifyWithBigint(newState), {
    headers: { "Content-Type": "application/json" },
  });
}
