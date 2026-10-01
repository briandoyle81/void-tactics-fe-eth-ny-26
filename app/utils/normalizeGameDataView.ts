import { ActionType, GameDataView } from "../types/types";

// Raw on-chain Game.ActionType only goes up to FactionAbility=5. Our shared
// ActionType enum additionally carries web2-only ClaimPoints=5 (see the
// enum's doc comment in types.ts), so a raw on-chain 5 must be remapped
// to the (non-colliding) ActionType.FactionAbility=7 before it reaches any
// shared display component — otherwise it would be misread as ClaimPoints.
const RAW_ONCHAIN_FACTION_ABILITY = 5;

/**
 * Normalizes a `GameDataView` freshly decoded from `Game.getGame`/
 * `getGamesFromIds` so its `lastMove.actionType` uses the app-wide
 * `ActionType` enum's values rather than the raw on-chain uint8.
 */
export function normalizeGameDataView(data: GameDataView): GameDataView {
  if (!data.lastMove) return data;
  if (Number(data.lastMove.actionType) !== RAW_ONCHAIN_FACTION_ABILITY) {
    return data;
  }
  return {
    ...data,
    lastMove: {
      ...data.lastMove,
      actionType: ActionType.FactionAbility,
    },
  };
}

/**
 * The write-side inverse of the above: `moveShip`'s `actionType` parameter
 * is a raw uint8 that Solidity casts straight to `Game.ActionType`, which
 * reverts on any value it doesn't define (0-5). Our shared enum's
 * `FactionAbility` is numbered 7 to avoid colliding with web2-only
 * `ClaimPoints` (5) — submitting that 7 directly would revert. Every real
 * web3 `moveShip` call must pass its `computedActionType` through this first.
 */
export function toOnChainActionType(actionType: ActionType): number {
  if (actionType === ActionType.FactionAbility) return RAW_ONCHAIN_FACTION_ABILITY;
  return actionType;
}

/** Cheap equality key so idle getGame polls do not replace an unchanged match snapshot. */
export function gameStateSyncKey(game: {
  metadata: { winner: string };
  turnState: {
    currentTurn: string;
    currentRound: number | bigint;
    turnStartTime: number | bigint;
  };
  creatorScore: number | bigint;
  joinerScore: number | bigint;
  lastMove?: {
    timestamp?: number | bigint;
    shipId: number | bigint;
    targetShipId: number | bigint;
    oldRow: number;
    oldCol: number;
    newRow: number;
    newCol: number;
    actionType: number | bigint;
  };
  shipPositions: readonly {
    shipId: number | bigint;
    position: { row: number; col: number };
    status?: number;
  }[];
  shipAttributes: readonly {
    hullPoints: number;
    reactorCriticalTimer: number;
  }[];
  creatorMovedShipIds: readonly (number | bigint)[];
  joinerMovedShipIds: readonly (number | bigint)[];
}): string {
  const lm = game.lastMove;
  return [
    String(game.turnState.currentTurn),
    String(game.turnState.currentRound),
    String(game.turnState.turnStartTime),
    game.metadata.winner,
    String(game.creatorScore),
    String(game.joinerScore),
    lm
      ? `${lm.timestamp}:${lm.shipId}:${lm.actionType}:${lm.targetShipId}:${lm.oldRow},${lm.oldCol}:${lm.newRow},${lm.newCol}`
      : "",
    game.shipPositions
      .map((p) => `${p.shipId}:${p.position.row},${p.position.col}:${p.status ?? 0}`)
      .join(";"),
    game.shipAttributes
      .map((a) => `${a.hullPoints}:${a.reactorCriticalTimer}`)
      .join(";"),
    `${game.creatorMovedShipIds.join(",")}|${game.joinerMovedShipIds.join(",")}`,
  ].join("/");
}

export type GameStateSyncSnapshot = Parameters<typeof gameStateSyncKey>[0] & {
  metadata: { winner: string; gameId?: number | bigint };
};

function gamesListSyncKey(games: readonly GameStateSyncSnapshot[]): string {
  return games
    .map(
      (game) =>
        `${game.metadata.gameId ?? ""}:${gameStateSyncKey(game)}`,
    )
    .join("|");
}

/** Keep the previous games list when an idle refetch decoded the same matches. */
export function keepUnchangedGamesList<T extends GameStateSyncSnapshot>(
  previous: T[] | undefined,
  next: T[],
): T[] {
  if (
    previous != null &&
    previous.length === next.length &&
    gamesListSyncKey(previous) === gamesListSyncKey(next)
  ) {
    return previous;
  }
  return next;
}

/** Keep the previous match snapshot when an idle poll decoded the same board. */
export function keepUnchangedGameSnapshot<T extends GameStateSyncSnapshot>(
  previous: T | undefined,
  next: T,
): T {
  if (previous != null && gameStateSyncKey(previous) === gameStateSyncKey(next)) {
    return previous;
  }
  return next;
}

/**
 * TanStack Query `structuralSharing`: reuse the previous `getGame` result
 * when the board fingerprint is unchanged so subscribers do not re-render.
 */
export function shareUnchangedGameData(
  oldData: unknown,
  newData: unknown,
): unknown {
  if (
    oldData == null ||
    newData == null ||
    typeof oldData !== "object" ||
    typeof newData !== "object"
  ) {
    return newData;
  }
  try {
    return keepUnchangedGameSnapshot(
      oldData as GameStateSyncSnapshot,
      newData as GameStateSyncSnapshot,
    );
  } catch {
    return newData;
  }
}
