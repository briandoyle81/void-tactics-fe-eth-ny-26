import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { ActionType } from "@/app/types/types";
import type { GameDataView, LastMove, ScoringPosition } from "@/app/types/types";
import { buildMapGridsFromContractMap } from "@/app/utils/mapGridUtils";
import { getEconomyConfig } from "@/app/lib/economyConfig";
import { AI_USER_ID, ensureAiUser } from "@/app/lib/aiUser";
import { runAiTurns } from "@/app/lib/aiAutoMove";
import type { AiDifficulty } from "@/app/utils/aiDispatch";

interface ActionBody {
  shipId: number;
  row: number;
  col: number;
  actionType: number;
  targetShipId: number;
  specialType?: number;
}

// Special ability config (mirrors contract ShipAttributes v1 specials)
const SPECIAL_CONFIG: Record<number, { range: number; strength: number }> = {
  1: { range: 3, strength: 0 },  // EMP: no HP damage, adds status effect
  2: { range: 2, strength: 30 }, // Repair: heals 30 HP
  3: { range: 3, strength: 50 }, // Flak: deals 50 damage, ignores LOS
};

function applyShootDamage(
  state: GameDataView,
  attackerShipId: number,
  targetShipId: number,
): GameDataView {
  const attackerIdx = state.shipIds.findIndex((id) => id === attackerShipId);
  const targetIdx = state.shipIds.findIndex((id) => id === targetShipId);
  if (attackerIdx === -1 || targetIdx === -1) return state;

  const newAttrs = [...state.shipAttributes];
  const attackerAttrs = newAttrs[attackerIdx]!;
  const targetAttrs = { ...newAttrs[targetIdx]! };

  const wasDisabled = targetAttrs.hullPoints === 0;

  if (!wasDisabled) {
    const baseDamage = attackerAttrs.gunDamage;
    const reduction = targetAttrs.damageReduction;
    const damage = Math.max(1, baseDamage - Math.floor((baseDamage * reduction) / 100));
    targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - damage);
  }

  // Shooting a ship that was already at 0 HP increments reactor timer; timer reaches 3 → ship destroyed
  if (wasDisabled) {
    targetAttrs.reactorCriticalTimer = (targetAttrs.reactorCriticalTimer || 0) + 1;
  }

  newAttrs[targetIdx] = targetAttrs;

  let newCreatorActive = [...state.creatorActiveShipIds];
  let newJoinerActive = [...state.joinerActiveShipIds];
  let newPositions = state.shipPositions;
  if (targetAttrs.reactorCriticalTimer >= 3) {
    newCreatorActive = newCreatorActive.filter((id) => id !== targetShipId);
    newJoinerActive = newJoinerActive.filter((id) => id !== targetShipId);
    newPositions = newPositions.filter((p) => p.shipId !== targetShipId);
  }

  return { ...state, shipAttributes: newAttrs, shipPositions: newPositions, creatorActiveShipIds: newCreatorActive, joinerActiveShipIds: newJoinerActive };
}

const TIE_ADDR = "0x0000000000000000000000000000000000000001";

function checkWinConditions(state: GameDataView): { winner: string | null; reason: string | null } {
  if (state.creatorActiveShipIds.length === 0) {
    return { winner: state.metadata.joiner as string, reason: "all_destroyed" };
  }
  if (state.joinerActiveShipIds.length === 0) {
    return { winner: state.metadata.creator as string, reason: "all_destroyed" };
  }
  const creatorDone = state.creatorScore >= state.maxScore;
  const joinerDone = state.joinerScore >= state.maxScore;
  if (creatorDone && joinerDone) {
    if (state.creatorScore > state.joinerScore) {
      return { winner: state.metadata.creator as string, reason: "score" };
    } else if (state.joinerScore > state.creatorScore) {
      return { winner: state.metadata.joiner as string, reason: "score" };
    } else {
      return { winner: TIE_ADDR, reason: "tie" };
    }
  }
  if (creatorDone) {
    return { winner: state.metadata.creator as string, reason: "score" };
  }
  if (joinerDone) {
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
    body = await req.json() as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shipId, row, col, actionType, targetShipId } = body;
  const specialType = body.specialType ?? 0;

  // Validate numeric fields — reject NaN, floats, and out-of-range enums
  if (!Number.isInteger(shipId) || shipId <= 0) return NextResponse.json({ error: "Invalid shipId" }, { status: 400 });
  if (!Number.isInteger(row) || row < 0 || row > 99) return NextResponse.json({ error: "Invalid row" }, { status: 400 });
  if (!Number.isInteger(col) || col < 0 || col > 99) return NextResponse.json({ error: "Invalid col" }, { status: 400 });
  if (!Number.isInteger(actionType) || actionType < 0 || actionType > 6) return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  if (!Number.isInteger(targetShipId) || targetShipId < 0) return NextResponse.json({ error: "Invalid targetShipId" }, { status: 400 });
  if (!Number.isInteger(specialType) || specialType < 0 || specialType > 3) return NextResponse.json({ error: "Invalid specialType" }, { status: 400 });

  const [game, economy] = await Promise.all([
    prisma.game.findFirst({
      where: {
        id: gameId,
        OR: [{ player1Id: userId! }, { player2Id: userId! }],
      },
      include: { lobby: { include: { map: true } } },
    }),
    getEconomyConfig(),
  ]);

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.phase !== "ACTIVE") return NextResponse.json({ error: "Game not active" }, { status: 409 });

  const state = game.state as unknown as GameDataView;

  if (String(state.turnState.currentTurn) !== userId!) {
    return NextResponse.json({ error: "Not your turn" }, { status: 409 });
  }

  const isCreator = String(state.metadata.creator) === userId!;
  const myActiveShipIds = isCreator ? state.creatorActiveShipIds : state.joinerActiveShipIds;
  const myMovedShipIds = isCreator ? state.creatorMovedShipIds : state.joinerMovedShipIds;
  const isRetreating = actionType === ActionType.Retreat;

  // Retreat bypasses the active-list check — disabled ships that have been removed from active
  // mid-combat (reactor timer ≥ 3) can still be retreated if they have a board position.
  if (!isRetreating && !myActiveShipIds.some((id) => id === shipId)) {
    return NextResponse.json({ error: "Ship not active or not yours" }, { status: 400 });
  }

  if (!isRetreating && myMovedShipIds.some((id) => id === shipId)) {
    return NextResponse.json({ error: "Ship already moved this round" }, { status: 409 });
  }

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) return NextResponse.json({ error: "Ship position not found" }, { status: 400 });

  // For retreat, verify ownership via position metadata since the ship may no longer be active
  if (isRetreating && shipPos.isCreator !== isCreator) {
    return NextResponse.json({ error: "Ship not active or not yours" }, { status: 400 });
  }

  // Build map grids for scoring at round end
  const mapData = game.lobby.map;
  const rawScoringTiles = mapData
    ? (mapData.scoringTiles as Array<{ row: number; col: number; points: number; onlyOnce: boolean }>)
    : [];
  const scoringPositions: ScoringPosition[] = rawScoringTiles;
  const { scoringGrid, blockedGrid } = buildMapGridsFromContractMap(
    mapData ? (mapData.blockedTiles as Array<{ row: number; col: number }>) : [],
    rawScoringTiles,
    state.gridDimensions.gridWidth,
    state.gridDimensions.gridHeight,
  );

  const now = Date.now();
  let newState: GameDataView = {
    ...state,
    mapId: state.mapId || game.lobby.mapId || 0,
    shipPositions: [...state.shipPositions],
    shipAttributes: [...state.shipAttributes],
    creatorActiveShipIds: [...state.creatorActiveShipIds],
    joinerActiveShipIds: [...state.joinerActiveShipIds],
    creatorMovedShipIds: [...state.creatorMovedShipIds],
    joinerMovedShipIds: [...state.joinerMovedShipIds],
  };

  const moveShipTo = (sid: number, newRow: number, newCol: number) => {
    const posIdx = newState.shipPositions.findIndex((p) => p.shipId === sid);
    if (posIdx === -1) return;
    const newPositions = [...newState.shipPositions];
    newPositions[posIdx] = { ...newPositions[posIdx]!, position: { row: newRow, col: newCol } };
    newState = { ...newState, shipPositions: newPositions };
  };

  const oldRow = shipPos.position.row;
  const oldCol = shipPos.position.col;

  // Snapshot opponent's active ships before any state mutation so we can count kills
  const opponentActivesBefore = new Set<number>(
    isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds,
  );

  let lastMove: LastMove;

  switch (actionType) {
    case ActionType.Pass:
    case ActionType.ClaimPoints: {
      moveShipTo(shipId, row, col);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Pass, targetShipId: 0, timestamp: now };
      break;
    }

    case ActionType.Shoot: {
      if (!targetShipId) {
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
        // EMP: target must be an enemy ship
        const opponentActiveIds = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
        if (!opponentActiveIds.some((id) => id === targetShipId)) {
          return NextResponse.json({ error: "Can only use EMP on enemy ships" }, { status: 400 });
        }
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        if (targetIdx !== -1) {
          const newAttrs = [...newState.shipAttributes];
          const targetAttrs = { ...newAttrs[targetIdx]! };
          targetAttrs.statusEffects = [...(targetAttrs.statusEffects ?? []), 1];
          targetAttrs.reactorCriticalTimer = (targetAttrs.reactorCriticalTimer || 0) + 1;
          newAttrs[targetIdx] = targetAttrs;
          if (targetAttrs.reactorCriticalTimer >= 3) {
            newState = {
              ...newState,
              shipAttributes: newAttrs,
              shipPositions: newState.shipPositions.filter((p) => p.shipId !== targetShipId),
              creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== targetShipId),
              joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== targetShipId),
            };
          } else {
            newState = { ...newState, shipAttributes: newAttrs };
          }
        }
      } else if (specialType === 2) {
        // Repair: target must be your own ship
        if (!myActiveShipIds.some((id) => id === targetShipId)) {
          return NextResponse.json({ error: "Can only repair your own ships" }, { status: 400 });
        }
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
        // Flak: deal gun damage to every active ship within range except the firing ship — no LOS check, friendly fire included
        const flakRange = SPECIAL_CONFIG[3]!.range;
        const allActiveIds = [
          ...newState.creatorActiveShipIds,
          ...newState.joinerActiveShipIds,
        ];
        for (const targetId of allActiveIds) {
          if (targetId === shipId) continue;
          const targetPos = newState.shipPositions.find(
            (p) => p.shipId === targetId,
          );
          if (!targetPos) continue;
          const dist =
            Math.abs(targetPos.position.row - row) +
            Math.abs(targetPos.position.col - col);
          if (dist <= flakRange) {
            newState = applyShootDamage(newState, shipId, targetId);
          }
        }
      }

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Special, targetShipId: targetShipId ?? 0, timestamp: now };
      break;
    }

    case ActionType.Assist: {
      if (!targetShipId) {
        return NextResponse.json({ error: "Target required for assist" }, { status: 400 });
      }
      if (!myActiveShipIds.some((id) => id === targetShipId)) {
        return NextResponse.json({ error: "Can only assist your own ships" }, { status: 400 });
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
      lastMove = { shipId, oldRow, oldCol, newRow: -1, newCol: -1, actionType: ActionType.Retreat, targetShipId: 0, timestamp: now };
      break;
    }

    case ActionType.Ram: {
      if (!targetShipId) {
        return NextResponse.json({ error: "Target required for ram" }, { status: 400 });
      }
      const ramTargetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
      if (ramTargetIdx === -1) {
        return NextResponse.json({ error: "Target ship not found" }, { status: 400 });
      }
      const ramTargetAttrs = newState.shipAttributes[ramTargetIdx];
      if (!ramTargetAttrs || ramTargetAttrs.hullPoints > 0) {
        return NextResponse.json({ error: "Can only ram disabled ships" }, { status: 400 });
      }

      // Move ramming ship to the target's position
      moveShipTo(shipId, row, col);

      // Remove rammed ship from the board and both active lists — no reactor damage to it
      newState = {
        ...newState,
        shipPositions: newState.shipPositions.filter((p) => p.shipId !== targetShipId),
        creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== targetShipId),
        joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== targetShipId),
      };

      // Ramming ship takes +1 reactor damage
      const rammerIdx = newState.shipIds.findIndex((id) => id === shipId);
      if (rammerIdx !== -1) {
        const newAttrs = [...newState.shipAttributes];
        const rammerAttrs = { ...newAttrs[rammerIdx]! };
        rammerAttrs.reactorCriticalTimer = (rammerAttrs.reactorCriticalTimer || 0) + 1;
        newAttrs[rammerIdx] = rammerAttrs;
        if (rammerAttrs.reactorCriticalTimer >= 3) {
          newState = {
            ...newState,
            shipAttributes: newAttrs,
            shipPositions: newState.shipPositions.filter((p) => p.shipId !== shipId),
            creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== shipId),
            joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== shipId),
          };
        } else {
          newState = { ...newState, shipAttributes: newAttrs };
        }
      }

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Ram, targetShipId, timestamp: now };
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
      metadata: { ...newState.metadata, winner: earlyWin.winner },
    };
  } else {
    // Turn advancement
    // Disabled (0-HP) ships don't need to submit moves; exclude them from the round-end check
    // so they stay on the field until the round-end reactor tick destroys them.
    const getShipHp = (sid: number): number => {
      const idx = newState.shipIds.findIndex((id) => id === sid);
      return idx === -1 ? 1 : (newState.shipAttributes[idx]?.hullPoints ?? 1);
    };
    const allCreatorMoved = newState.creatorActiveShipIds
      .filter((id) => getShipHp(id) > 0)
      .every((id) => newState.creatorMovedShipIds.some((mid) => mid === id));
    const allJoinerMoved = newState.joinerActiveShipIds
      .filter((id) => getShipHp(id) > 0)
      .every((id) => newState.joinerMovedShipIds.some((mid) => mid === id));

    if (allCreatorMoved && allJoinerMoved) {
      // Round end: award scoring points first (disabled ships on tiles still score)
      for (const pos of newState.shipPositions) {
        const pts = scoringGrid[pos.position.row]?.[pos.position.col] ?? 0;
        if (pts > 0) {
          if (newState.creatorActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, creatorScore: newState.creatorScore + pts };
          } else if (newState.joinerActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, joinerScore: newState.joinerScore + pts };
          }
        }
      }

      // Round-end reactor tick: every active 0-HP ship gains +1 reactor damage.
      // Ships reaching timer >= 3 are destroyed (removed from board and active lists).
      {
        const reactorAttrs = [...newState.shipAttributes];
        let reactorCreatorActive = [...newState.creatorActiveShipIds];
        let reactorJoinerActive = [...newState.joinerActiveShipIds];
        const destroyedIds = new Set<number>();
        const activeSet = new Set([...reactorCreatorActive, ...reactorJoinerActive]);
        (newState.shipIds as number[]).forEach((sid, idx) => {
          if (!activeSet.has(sid)) return;
          const attrs = { ...reactorAttrs[idx]! };
          if (attrs.hullPoints === 0) {
            attrs.reactorCriticalTimer = (attrs.reactorCriticalTimer || 0) + 1;
            reactorAttrs[idx] = attrs;
            if (attrs.reactorCriticalTimer >= 3) {
              destroyedIds.add(sid);
              reactorCreatorActive = reactorCreatorActive.filter((id) => id !== sid);
              reactorJoinerActive = reactorJoinerActive.filter((id) => id !== sid);
            }
          }
        });
        newState = {
          ...newState,
          shipAttributes: reactorAttrs,
          shipPositions: destroyedIds.size > 0
            ? newState.shipPositions.filter((p) => !destroyedIds.has(p.shipId))
            : newState.shipPositions,
          creatorActiveShipIds: reactorCreatorActive,
          joinerActiveShipIds: reactorJoinerActive,
        };
      }

      const roundEndWin = checkWinConditions(newState);
      if (roundEndWin.winner) {
        gamePhase = "COMPLETED";
        winnerId = roundEndWin.winner;
        newState = {
          ...newState,
          metadata: { ...newState.metadata, winner: roundEndWin.winner },
        };
      } else {
        // Start next round — alternate who goes first each round
        const nextCreatorGoesFirst = !newState.metadata.creatorGoesFirst;
        const firstPlayerNextRound = nextCreatorGoesFirst
          ? newState.metadata.creator
          : newState.metadata.joiner;
        newState = {
          ...newState,
          metadata: { ...newState.metadata, creatorGoesFirst: nextCreatorGoesFirst },
          creatorMovedShipIds: [],
          joinerMovedShipIds: [],
          turnState: {
            ...newState.turnState,
            currentRound: newState.turnState.currentRound + 1,
            currentTurn: firstPlayerNextRound,
            turnStartTime: Date.now(),
          },
        };
      }
    } else {
      // One ship per turn: pass to the opponent, but skip them if they have no healthy unmoved ships
      const nextTurnDefault = isCreator ? newState.metadata.joiner : newState.metadata.creator;
      const nextIsCreator = String(nextTurnDefault) === String(newState.metadata.creator);
      const nextHasUnmovedHealthy = nextIsCreator
        ? newState.creatorActiveShipIds.some(
            (id) => getShipHp(id) > 0 && !newState.creatorMovedShipIds.some((mid) => mid === id),
          )
        : newState.joinerActiveShipIds.some(
            (id) => getShipHp(id) > 0 && !newState.joinerMovedShipIds.some((mid) => mid === id),
          );
      // If the opponent has nothing to move, keep turn with current player
      const nextTurn = nextHasUnmovedHealthy
        ? nextTurnDefault
        : isCreator ? newState.metadata.creator : newState.metadata.joiner;
      newState = {
        ...newState,
        turnState: { ...newState.turnState, currentTurn: nextTurn, turnStartTime: Date.now() },
      };
    }
  }

  // Count enemy ships killed this action (direct + any round-end reactor ticks).
  // Rammed ships are force-retreated, not killed — exclude them from kill credit.
  const opponentActivesAfter = new Set<number>(
    isCreator ? newState.joinerActiveShipIds : newState.creatorActiveShipIds,
  );
  const killCount = [...opponentActivesBefore].filter((id) => {
    if (opponentActivesAfter.has(id)) return false;
    if (actionType === ActionType.Ram && id === targetShipId) return false;
    return true;
  }).length;

  const submittedRound = Number(state.turnState.currentRound);

  // Persist
  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: {
        state: newState as object,
        currentTurn: String(newState.turnState.currentTurn),
        currentRound: Number(newState.turnState.currentRound),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phase: gamePhase as any,
        winnerId,
      },
    });

    await tx.gameTurn.create({
      data: {
        gameId,
        playerId: userId!,
        round: submittedRound,
        actions: [{ actionType, shipId, row, col, oldRow, oldCol, targetShipId, specialType }],
        snapshot: newState as object,
      },
    });

    // Award kill reward and increment shipsDestroyed on attacking ship
    if (killCount > 0) {
      const attacker = await tx.user.findUnique({
        where: { id: userId! },
        select: { purchasedShipCount: true },
      });
      if ((attacker?.purchasedShipCount ?? 0) >= economy.purchaseThresholdForRewards) {
        await tx.user.update({
          where: { id: userId! },
          data: { creditBalance: { increment: killCount * economy.killRewardUtc } },
        });
      }
      await tx.ship.update({
        where: { id: shipId, ownerId: userId! },
        data: { shipsDestroyed: { increment: killCount } },
      });
    }

    if (gamePhase === "COMPLETED" && winnerId && winnerId !== game.winnerId) {
      if (winnerId === TIE_ADDR) {
        await tx.playerStats.upsert({
          where: { userId: game.player1Id },
          update: { draws: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: game.player1Id, draws: 1, totalGames: 1 },
        });
        await tx.playerStats.upsert({
          where: { userId: game.player2Id },
          update: { draws: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: game.player2Id, draws: 1, totalGames: 1 },
        });
      } else {
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
      // Free all ships used in this game so players can use them again
      const gameFleets = await tx.fleet.findMany({ where: { lobbyId: game.lobbyId } });
      const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds as number[]);
      if (allFleetShipIds.length > 0) {
        await tx.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } });
      }
    }
  });

  // After the player's action, if it's now the AI's turn, run AI auto-moves.
  // The AI takes all its actions inline and returns the final state to the client,
  // so the client never sees an intermediate "AI thinking" state.
  if (
    game.lobby.isAiGame &&
    gamePhase === "ACTIVE" &&
    String(newState.turnState.currentTurn) === AI_USER_ID
  ) {
    const aiIsCreator = String(newState.metadata.creator) === AI_USER_ID;
    const diff = (game.lobby.aiDifficulty ?? "recruit") as AiDifficulty;

    await ensureAiUser(); // no-op if already exists

    const aiResult = await runAiTurns(
      gameId,
      game.lobbyId,
      newState,
      diff,
      aiIsCreator,
      blockedGrid,
      scoringPositions,
    );
    newState = aiResult.state;

    // Handle game completion triggered by an AI action
    if (aiResult.phase === "COMPLETED" && aiResult.winnerId && aiResult.winnerId !== game.winnerId) {
      const aiWinnerId = aiResult.winnerId;
      await prisma.$transaction(async (tx) => {
        if (aiWinnerId === TIE_ADDR) {
          for (const pid of [game.player1Id, game.player2Id]) {
            if (pid === AI_USER_ID) continue;
            await tx.playerStats.upsert({
              where: { userId: pid },
              update: { draws: { increment: 1 }, totalGames: { increment: 1 } },
              create: { userId: pid, draws: 1, totalGames: 1 },
            });
          }
        } else {
          const loserId = aiWinnerId === game.player1Id ? game.player2Id : game.player1Id;
          for (const [pid, isWin] of [[aiWinnerId, true], [loserId, false]] as [string, boolean][]) {
            if (pid === AI_USER_ID) continue;
            await tx.playerStats.upsert({
              where: { userId: pid },
              update: isWin
                ? { wins: { increment: 1 }, totalGames: { increment: 1 } }
                : { losses: { increment: 1 }, totalGames: { increment: 1 } },
              create: { userId: pid, ...(isWin ? { wins: 1 } : { losses: 1 }), totalGames: 1 },
            });
          }
        }
        const gameFleets = await tx.fleet.findMany({ where: { lobbyId: game.lobbyId } });
        const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds as number[]);
        if (allFleetShipIds.length > 0) {
          await tx.ship.updateMany({
            where: { id: { in: allFleetShipIds } },
            data: { inFleet: false },
          });
        }
      });
    }
  }

  return NextResponse.json(newState);
}
