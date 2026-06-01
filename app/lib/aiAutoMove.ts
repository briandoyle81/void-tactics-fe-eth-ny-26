/**
 * Runs AI turns until it is no longer the AI's turn (or the game ends).
 * Called by the action route after a player action results in the AI's turn.
 *
 * The AI makes one action per loop iteration (one ship at a time, matching the
 * server's per-ship turn model). After each action it checks for round-end and
 * win conditions, mirroring the logic in app/api/games/[id]/action/route.ts.
 *
 * Returns the final GameDataView and the game phase/winnerId after all AI moves.
 * Also persists each AI GameTurn and does a final game.update to the DB.
 */

import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import type { AiDifficulty } from "../utils/aiDispatch";
import { pickAiAction } from "../utils/aiDispatch";
import { applyActionToState } from "../utils/aiGreedy";
import { applyRoundEndTicks } from "../utils/aiMinimax";
import { ActionType } from "../types/types";
import type { GameDataView, ScoringPosition } from "../types/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function checkWin(state: GameDataView): string | null {
  if ((state.creatorActiveShipIds as number[]).length === 0) {
    return String(state.metadata.joiner);
  }
  if ((state.joinerActiveShipIds as number[]).length === 0) {
    return String(state.metadata.creator);
  }
  const creatorDone = state.creatorScore >= state.maxScore;
  const joinerDone = state.joinerScore >= state.maxScore;
  if (creatorDone && joinerDone) {
    return state.creatorScore >= state.joinerScore
      ? String(state.metadata.creator)
      : String(state.metadata.joiner);
  }
  if (creatorDone) return String(state.metadata.creator);
  if (joinerDone) return String(state.metadata.joiner);
  return null;
}

function buildScoringGrid(
  positions: ScoringPosition[],
  gridWidth: number,
  gridHeight: number,
): number[][] {
  const grid: number[][] = Array.from({ length: gridHeight }, () =>
    new Array(gridWidth).fill(0),
  );
  for (const pos of positions) {
    if (pos.row >= 0 && pos.row < gridHeight && pos.col >= 0 && pos.col < gridWidth) {
      grid[pos.row][pos.col] = pos.points;
    }
  }
  return grid;
}

// Applies round-end scoring + reactor ticks (mirrors route.ts round-end block).
function applyRoundEndWithScoring(
  state: GameDataView,
  scoringGrid: number[][],
): GameDataView {
  let s = state;
  for (const pos of s.shipPositions) {
    const pts = scoringGrid[pos.position.row]?.[pos.position.col] ?? 0;
    if (pts > 0) {
      if ((s.creatorActiveShipIds as number[]).includes(pos.shipId)) {
        s = { ...s, creatorScore: s.creatorScore + pts };
      } else if ((s.joinerActiveShipIds as number[]).includes(pos.shipId)) {
        s = { ...s, joinerScore: s.joinerScore + pts };
      }
    }
  }
  // Reactor ticks + ship removal + moved-list reset
  return applyRoundEndTicks(s);
}

// ── Main export ────────────────────────────────────────────────────────────────

export interface AiTurnResult {
  state: GameDataView;
  phase: string;
  winnerId: string | null;
}

/**
 * Runs all AI turns until it is the human player's turn or the game ends.
 *
 * Reads the AI fleet from the DB (to build the specials map).
 * Persists a GameTurn record after each AI action.
 * Updates game.state/currentTurn/phase/winnerId in the DB before returning.
 */
export async function runAiTurns(
  gameId: number,
  lobbyId: number,
  initialState: GameDataView,
  difficulty: AiDifficulty,
  aiIsCreator: boolean,
  blockedGrid: boolean[][],
  scoringPositions: ScoringPosition[],
): Promise<AiTurnResult> {
  const aiId = aiIsCreator
    ? String(initialState.metadata.creator)
    : String(initialState.metadata.joiner);

  // Build specials map from the AI's fleet in the DB
  const specials = new Map<number, number>();
  const aiFleet = await prisma.fleet.findFirst({
    where: { lobbyId, ownerId: AI_USER_ID },
  });
  if (aiFleet) {
    const aiShips = await prisma.ship.findMany({
      where: { id: { in: aiFleet.shipIds as number[] } },
      select: { id: true, equipment: true },
    });
    for (const ship of aiShips) {
      const eq = ship.equipment as { special?: number };
      specials.set(ship.id, eq.special ?? 0);
    }
  }

  const scoringGrid = buildScoringGrid(
    scoringPositions,
    initialState.gridDimensions.gridWidth,
    initialState.gridDimensions.gridHeight,
  );

  let state = initialState;
  let phase = "ACTIVE";
  let winnerId: string | null = null;

  for (
    let iter = 0;
    iter < 30 &&
    String(state.turnState.currentTurn) === aiId &&
    phase === "ACTIVE";
    iter++
  ) {
    const action = pickAiAction(
      difficulty,
      state,
      aiIsCreator,
      blockedGrid,
      scoringPositions,
      specials,
    );
    if (!action) break;

    const submittedRound = Number(state.turnState.currentRound);
    const shipPos = state.shipPositions.find((p) => p.shipId === action.shipId);
    const oldRow = shipPos?.position.row ?? 0;
    const oldCol = shipPos?.position.col ?? 0;

    state = applyActionToState(state, action);

    state = {
      ...state,
      lastMove: {
        shipId: action.shipId,
        oldRow,
        oldCol,
        newRow: action.actionType === ActionType.Retreat ? -1 : action.row,
        newCol: action.actionType === ActionType.Retreat ? -1 : action.col,
        actionType: action.actionType,
        targetShipId: action.targetShipId,
        timestamp: Date.now(),
      },
    };

    // Early win check (e.g. AI just destroyed last enemy ship)
    const earlyWinner = checkWin(state);
    if (earlyWinner) {
      state = { ...state, metadata: { ...state.metadata, winner: earlyWinner } };
      phase = "COMPLETED";
      winnerId = earlyWinner;
      await prisma.gameTurn.create({
        data: {
          gameId,
          playerId: aiId,
          round: submittedRound,
          actions: [action as object],
          snapshot: state as object,
        },
      });
      break;
    }

    // Round-end check: all healthy ships on both sides have moved
    const getHP = (sid: number): number => {
      const idx = (state.shipIds as number[]).indexOf(sid);
      return idx === -1 ? 1 : (state.shipAttributes[idx]?.hullPoints ?? 1);
    };
    const allCreatorMoved = (state.creatorActiveShipIds as number[])
      .filter((id) => getHP(id) > 0)
      .every((id) => (state.creatorMovedShipIds as number[]).includes(id));
    const allJoinerMoved = (state.joinerActiveShipIds as number[])
      .filter((id) => getHP(id) > 0)
      .every((id) => (state.joinerMovedShipIds as number[]).includes(id));

    if (allCreatorMoved && allJoinerMoved) {
      state = applyRoundEndWithScoring(state, scoringGrid);
      const roundWinner = checkWin(state);
      if (roundWinner) {
        state = { ...state, metadata: { ...state.metadata, winner: roundWinner } };
        phase = "COMPLETED";
        winnerId = roundWinner;
        await prisma.gameTurn.create({
          data: {
            gameId,
            playerId: aiId,
            round: submittedRound,
            actions: [action as object],
            snapshot: state as object,
          },
        });
        break;
      }
      // Start next round — alternate first-mover
      const nextCreatorGoesFirst = !state.metadata.creatorGoesFirst;
      const firstPlayer = nextCreatorGoesFirst
        ? state.metadata.creator
        : state.metadata.joiner;
      state = {
        ...state,
        metadata: { ...state.metadata, creatorGoesFirst: nextCreatorGoesFirst },
        // moved lists already cleared by applyRoundEndTicks
        turnState: {
          ...state.turnState,
          currentRound: state.turnState.currentRound + 1,
          currentTurn: firstPlayer,
          turnStartTime: Date.now(),
        },
      };
    } else {
      // Pass turn: normally to the opponent; stay if opponent has no unmoved healthy ships
      const nextDefault = aiIsCreator ? state.metadata.joiner : state.metadata.creator;
      const nextIsCreator = String(nextDefault) === String(state.metadata.creator);
      const nextHasUnmoved = nextIsCreator
        ? (state.creatorActiveShipIds as number[]).some(
            (id) =>
              getHP(id) > 0 &&
              !(state.creatorMovedShipIds as number[]).includes(id),
          )
        : (state.joinerActiveShipIds as number[]).some(
            (id) =>
              getHP(id) > 0 &&
              !(state.joinerMovedShipIds as number[]).includes(id),
          );
      const nextTurn = nextHasUnmoved
        ? nextDefault
        : aiIsCreator
          ? state.metadata.creator
          : state.metadata.joiner;
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentTurn: nextTurn,
          turnStartTime: Date.now(),
        },
      };
    }

    await prisma.gameTurn.create({
      data: {
        gameId,
        playerId: aiId,
        round: submittedRound,
        actions: [action as object],
        snapshot: state as object,
      },
    });
  }

  // Persist final state
  await prisma.game.update({
    where: { id: gameId },
    data: {
      state: state as object,
      currentTurn: String(state.turnState.currentTurn),
      currentRound: Number(state.turnState.currentRound),
      phase: phase as "ACTIVE" | "COMPLETED",
      ...(winnerId ? { winnerId } : {}),
    },
  });

  return { state, phase, winnerId };
}
