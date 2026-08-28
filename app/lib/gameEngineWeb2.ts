import { prisma } from "./prisma";
import { getEconomyConfig } from "./economyConfig";
import { getMapTiles } from "./getMapTiles";
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
import { hasLineOfSight } from "../utils/gameGridRanges";
import { computeMovementRange } from "../utils/gameGridRangesWeb2";
import { ActionType, ScoringPosition } from "../types/types";
import type { Web2GameDataView, Web2LastMove } from "../types/web2Game";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import { GamePhase } from "../generated/prisma";
import { SPECIAL_CONFIG } from "../utils/specialConfigWeb2";
import { resolveTournamentMatchIfApplicable } from "./resolveTournamentMatchIfApplicable";
import { resolveCampaignNodeIfApplicable } from "./resolveCampaignNodeIfApplicable";
import { resolveRoguelikeRunIfApplicable } from "./resolveRoguelikeRunIfApplicable";
import { AI_USER_ID } from "../config/aiUser";

// Server-side turn-processing engine — ported from `explore-traditional`'s
// `app/api/games/[id]/action/route.ts` (human-vs-human logic only; the
// source branch's AI auto-move block was stripped entirely, see the plan).
// Keeps the API route thin: the route does auth + request-shape parsing,
// this module does everything else (load, validate, compute, persist).

export class GameActionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface GameActionInput {
  shipId: number;
  row: number;
  col: number;
  actionType: number;
  targetShipId: number;
  specialType?: number;
}

function applyShootDamage(
  state: Web2GameDataView,
  attackerShipId: number,
  targetShipId: number,
): Web2GameDataView {
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
    // Applying a hit always deals a minimum of 1 (unlike the client's damage
    // *preview*, which can show 0 — see calculateDamageWeb2.ts).
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

function checkWinConditions(state: Web2GameDataView): { winner: string | null; reason: string | null } {
  if (state.creatorActiveShipIds.length === 0) {
    return { winner: state.metadata.joiner, reason: "all_destroyed" };
  }
  if (state.joinerActiveShipIds.length === 0) {
    return { winner: state.metadata.creator, reason: "all_destroyed" };
  }
  const creatorDone = state.creatorScore >= state.maxScore;
  const joinerDone = state.joinerScore >= state.maxScore;
  if (creatorDone && joinerDone) {
    if (state.creatorScore > state.joinerScore) {
      return { winner: state.metadata.creator, reason: "score" };
    } else if (state.joinerScore > state.creatorScore) {
      return { winner: state.metadata.joiner, reason: "score" };
    } else {
      return { winner: WEB2_TIE_SENTINEL, reason: "tie" };
    }
  }
  if (creatorDone) {
    return { winner: state.metadata.creator, reason: "score" };
  }
  if (joinerDone) {
    return { winner: state.metadata.joiner, reason: "score" };
  }
  return { winner: null, reason: null };
}

/**
 * Reject a move destination that isn't actually reachable, a shot whose
 * target is out of weapon range or lacks line of sight, a ram whose
 * destination isn't the target's own tile, and an EMP/Repair special whose
 * target is out of the special's range. (Flak needs no separate target-range
 * check — its blast radius is self-contained, computed server-side from the
 * ship's own destination tile; see the Special/specialType===3 case in
 * applyGameAction.) Ram/EMP/Repair range enforcement was intentionally
 * deferred when this engine was first ported (the source branch's handlers
 * only ever validated ownership/team constraints, never range) — closing
 * that gap here since it let a ship ram/EMP/repair a target anywhere on the
 * board regardless of position. Uses the same shared
 * `gameGridRangesWeb2.ts`/`hasLineOfSight` module the client uses for range
 * highlighting, and the same `SPECIAL_CONFIG` range table the client reads
 * for EMP/Repair — no duplicated/diverging logic.
 */
function validateDestinationAndTarget(params: {
  state: Web2GameDataView;
  shipId: number;
  row: number;
  col: number;
  actionType: number;
  targetShipId: number;
  specialType: number;
  blockedGrid: boolean[][];
}) {
  const { state, shipId, row, col, actionType, targetShipId, specialType, blockedGrid } = params;

  if (actionType === ActionType.Retreat) return; // no destination to validate

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) throw new GameActionError(400, "Ship position not found");
  const { row: curRow, col: curCol } = shipPos.position;

  const isStayingPut = row === curRow && col === curCol;
  if (!isStayingPut) {
    const shipMap = new Map<number, true>(state.shipIds.map((id) => [id, true]));
    const attrsByShip = new Map(state.shipIds.map((id, i) => [id, state.shipAttributes[i]]));
    // Mirrors the client's canEnterOccupiedCell (useGameplayInteraction.ts)
    // exactly: a Ram may move onto a tile occupied by a disabled enemy ship.
    const opponentActiveIds = shipPos.isCreator
      ? state.joinerActiveShipIds
      : state.creatorActiveShipIds;
    const reachable = computeMovementRange({
      gridWidth: state.gridDimensions.gridWidth,
      gridHeight: state.gridDimensions.gridHeight,
      selectedShipId: shipId,
      hasShips: true,
      shipMap,
      getShipAttributes: (id) => attrsByShip.get(id) ?? null,
      shipPositions: state.shipPositions,
      previewPosition: null,
      canEnterOccupiedCell: (_row, _col, occupyingShipId) =>
        actionType === ActionType.Ram &&
        occupyingShipId !== shipId &&
        opponentActiveIds.includes(occupyingShipId) &&
        attrsByShip.get(occupyingShipId)?.hullPoints === 0,
    });
    if (!reachable.some((p) => p.row === row && p.col === col)) {
      throw new GameActionError(400, "Destination out of movement range");
    }
  }

  if (actionType === ActionType.Shoot) {
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    const shooterIdx = state.shipIds.findIndex((id) => id === shipId);
    const shooterAttrs = state.shipAttributes[shooterIdx];
    if (!targetPos || !shooterAttrs) throw new GameActionError(400, "Invalid shot");
    const distance = Math.abs(targetPos.position.row - row) + Math.abs(targetPos.position.col - col);
    const range = shooterAttrs.range || 1;
    if (distance !== 1 && distance > range) {
      throw new GameActionError(400, "Target out of weapon range");
    }
    if (distance > 1 && !hasLineOfSight(row, col, targetPos.position.row, targetPos.position.col, blockedGrid)) {
      throw new GameActionError(400, "No line of sight to target");
    }
  }

  if (actionType === ActionType.Ram) {
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    if (!targetPos) throw new GameActionError(400, "Invalid ram target");
    if (targetPos.position.row !== row || targetPos.position.col !== col) {
      throw new GameActionError(400, "Ram destination must be the target ship's tile");
    }
  }

  if (actionType === ActionType.Special && (specialType === 1 || specialType === 2)) {
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    if (!targetPos) throw new GameActionError(400, "Invalid special target");
    const distance = Math.abs(targetPos.position.row - row) + Math.abs(targetPos.position.col - col);
    const range = SPECIAL_CONFIG[specialType]!.range;
    if (distance > range) {
      throw new GameActionError(400, "Target out of special range");
    }
  }
}

export async function applyGameAction(
  gameId: number,
  userId: string,
  input: GameActionInput,
): Promise<Web2GameDataView> {
  const { shipId, row, col, actionType, targetShipId } = input;
  const specialType = input.specialType ?? 0;

  const [game, economy] = await Promise.all([
    prisma.game.findFirst({
      where: { id: gameId, OR: [{ player1Id: userId }, { player2Id: userId }] },
      include: { lobby: true },
    }),
    getEconomyConfig(),
  ]);

  if (!game) throw new GameActionError(404, "Not found");
  if (game.phase !== GamePhase.ACTIVE) throw new GameActionError(409, "Game not active");

  const state = game.state as unknown as Web2GameDataView;

  if (state.turnState.currentTurn !== userId) {
    throw new GameActionError(409, "Not your turn");
  }

  const isCreator = state.metadata.creator === userId;
  const myActiveShipIds = isCreator ? state.creatorActiveShipIds : state.joinerActiveShipIds;
  const myMovedShipIds = isCreator ? state.creatorMovedShipIds : state.joinerMovedShipIds;
  const isRetreating = actionType === ActionType.Retreat;

  // Retreat bypasses the active-list check — disabled ships that have been removed from active
  // mid-combat (reactor timer ≥ 3) can still be retreated if they have a board position.
  if (!isRetreating && !myActiveShipIds.some((id) => id === shipId)) {
    throw new GameActionError(400, "Ship not active or not yours");
  }

  if (!isRetreating && myMovedShipIds.some((id) => id === shipId)) {
    throw new GameActionError(409, "Ship already moved this round");
  }

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) throw new GameActionError(400, "Ship position not found");

  // For retreat, verify ownership via position metadata since the ship may no longer be active
  if (isRetreating && shipPos.isCreator !== isCreator) {
    throw new GameActionError(400, "Ship not active or not yours");
  }

  // Build map grids for scoring at round end + server-side range/LOS
  // validation. Cached by mapId — see getMapTiles.ts — since map tiles are
  // static after creation but this runs on every single action submission.
  const mapData = game.lobby.mapId ? await getMapTiles(game.lobby.mapId) : null;
  const rawScoringTiles = mapData
    ? (mapData.scoringTiles as unknown as ScoringPosition[])
    : [];
  const { scoringGrid, blockedGrid } = buildMapGridsFromContractMap(
    mapData ? (mapData.blockedTiles as unknown as Array<{ row: number; col: number }>) : [],
    rawScoringTiles,
    state.gridDimensions.gridWidth,
    state.gridDimensions.gridHeight,
  );

  validateDestinationAndTarget({ state, shipId, row, col, actionType, targetShipId, specialType, blockedGrid });

  const now = Date.now();
  let newState: Web2GameDataView = {
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

  let lastMove: Web2LastMove;

  switch (actionType) {
    case ActionType.Pass:
    case ActionType.ClaimPoints: {
      moveShipTo(shipId, row, col);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Pass, targetShipId: 0, timestamp: now };
      break;
    }

    case ActionType.Shoot: {
      if (!targetShipId) throw new GameActionError(400, "Target required for shoot");
      moveShipTo(shipId, row, col);
      newState = applyShootDamage(newState, shipId, targetShipId);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Shoot, targetShipId, timestamp: now };
      break;
    }

    case ActionType.Special: {
      if (!targetShipId && specialType !== 3) {
        throw new GameActionError(400, "Target required for special");
      }
      moveShipTo(shipId, row, col);

      if (specialType === 1) {
        // EMP: target must be an enemy ship
        const opponentActiveIds = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
        if (!opponentActiveIds.some((id) => id === targetShipId)) {
          throw new GameActionError(400, "Can only use EMP on enemy ships");
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
          throw new GameActionError(400, "Can only repair your own ships");
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
      if (!targetShipId) throw new GameActionError(400, "Target required for ram");
      // Must be an enemy ship, not one of the ramming player's own —
      // ramming your own disabled ship has no legitimate use (it can only
      // deny yourself a future reactor-tick kill credit).
      const opponentActiveIdsForRam = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
      if (!opponentActiveIdsForRam.some((id) => id === targetShipId)) {
        throw new GameActionError(400, "Can only ram enemy ships");
      }
      const ramTargetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
      if (ramTargetIdx === -1) throw new GameActionError(400, "Target ship not found");
      const ramTargetAttrs = newState.shipAttributes[ramTargetIdx];
      if (!ramTargetAttrs || ramTargetAttrs.hullPoints > 0) {
        throw new GameActionError(400, "Can only ram disabled ships");
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
      throw new GameActionError(400, "Unknown action type");
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
  let gamePhase: GamePhase = game.phase;
  let winnerId: string | null = game.winnerId;

  if (earlyWin.winner) {
    gamePhase = GamePhase.COMPLETED;
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
        newState.shipIds.forEach((sid, idx) => {
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
        gamePhase = GamePhase.COMPLETED;
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
      const nextIsCreator = nextTurnDefault === newState.metadata.creator;
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

  const submittedRound = state.turnState.currentRound;
  const finalState = newState;
  const finalPhase = gamePhase;
  const finalWinnerId = winnerId;

  await prisma.$transaction(async (tx) => {
    // Optimistic concurrency check: the entire new state was computed in JS
    // from the `game` row read at the top of this function. If another
    // request (e.g. the same player double-submitting, or a network retry)
    // committed a change to this game between that read and now, `updatedAt`
    // will have moved and this conditional update matches zero rows —
    // meaning our computed state is stale and must not be applied. Using
    // `updateMany` (not `update`) so the row-count check is possible; the
    // row is uniquely identified by `id` regardless.
    const committed = await tx.game.updateMany({
      where: { id: gameId, updatedAt: game.updatedAt },
      data: {
        state: finalState as unknown as object,
        currentTurn: finalState.turnState.currentTurn,
        currentRound: finalState.turnState.currentRound,
        phase: finalPhase,
        winnerId: finalWinnerId,
      },
    });
    if (committed.count === 0) {
      throw new GameActionError(409, "Game state changed — please retry");
    }

    await tx.gameTurn.create({
      data: {
        gameId,
        playerId: userId,
        round: submittedRound,
        actions: [{ actionType, shipId, row, col, oldRow, oldCol, targetShipId, specialType }],
        snapshot: finalState as unknown as object,
      },
    });

    // Award kill reward and increment shipsDestroyed on attacking ship.
    // Currency depends only on the *victim's* ownership (docs/faction-2.md
    // §1) — destroying the AI opponent pays DEC, destroying a human
    // opponent (PvP) pays UTC, never both and never based on ship variant.
    if (killCount > 0) {
      const attacker = await tx.user.findUnique({
        where: { id: userId },
        select: { purchasedShipCount: true },
      });
      if ((attacker?.purchasedShipCount ?? 0) >= economy.purchaseThresholdForRewards) {
        const opponentIsAI = game.player1Id === AI_USER_ID || game.player2Id === AI_USER_ID;
        await tx.user.update({
          where: { id: userId },
          data: opponentIsAI
            ? { decBalance: { increment: killCount * economy.killRewardDec } }
            : { creditBalance: { increment: killCount * economy.killRewardUtc } },
        });
      }
      await tx.ship.update({
        where: { id: shipId, ownerId: userId },
        data: { shipsDestroyed: { increment: killCount } },
      });
    }

    if (finalPhase === GamePhase.COMPLETED && finalWinnerId && finalWinnerId !== game.winnerId) {
      if (finalWinnerId === WEB2_TIE_SENTINEL) {
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
        const loserId = finalWinnerId === game.player1Id ? game.player2Id : game.player1Id;
        await tx.playerStats.upsert({
          where: { userId: finalWinnerId },
          update: { wins: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: finalWinnerId, wins: 1, totalGames: 1 },
        });
        await tx.playerStats.upsert({
          where: { userId: loserId },
          update: { losses: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: loserId, losses: 1, totalGames: 1 },
        });
      }
      // Free all ships used in this game so players can use them again
      const gameFleets = await tx.fleet.findMany({ where: { lobbyId: game.lobbyId } });
      const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds);
      if (allFleetShipIds.length > 0) {
        await tx.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } });
      }
    }
  });

  // A tie leaves no clear winner to advance a tournament bracket with — leave
  // the match unresolved for the tournament creator to resolve manually
  // (mirrors web3's admin "resolve as draw" action), matching the
  // stats-skip above.
  if (finalPhase === GamePhase.COMPLETED && finalWinnerId && finalWinnerId !== game.winnerId && finalWinnerId !== WEB2_TIE_SENTINEL) {
    await resolveTournamentMatchIfApplicable(game.lobbyId, finalWinnerId);
    await resolveCampaignNodeIfApplicable(game.lobbyId, finalWinnerId);
    await resolveRoguelikeRunIfApplicable(game.lobbyId, finalWinnerId);
  }

  return finalState;
}
