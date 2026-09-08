import { ActionType, Attributes } from "./types";

// Web2-mode game types — full turn-submission/replay/display support (see
// app/lib/createGameFromLobby.ts, app/lib/gameEngineWeb2.ts). Parallel to
// (never sharing a definition with) the web3 `GameDataView` and friends in
// `./types.ts`, for the same reasons as `Web2Ship`/`Web2Lobby`. `Attributes`
// and `ActionType` have no bigint/address fields, so they're shared as-is.

export interface Web2GameMetadata {
  gameId: number;
  lobbyId: number;
  creator: string;
  joiner: string;
  creatorFleetId: number;
  joinerFleetId: number;
  creatorGoesFirst: boolean;
  startedAt: number;
  winner: string;
  /**
   * Display labels for `creator`/`joiner` (username, falling back to an
   * email-local-part or a short id) — attached at read time by
   * GET /api/games, never persisted into the stored `state` JSON, so a
   * later username change is reflected without a backfill. Web2 counterpart
   * to web3 Profile.tsx/Games.tsx's truncated-address opponent display,
   * since a raw web2 user id isn't meaningful to show.
   */
  creatorLabel?: string;
  joinerLabel?: string;
  /**
   * Set when this game originated from a Campaign mission / Roguelike combat
   * node (via Lobby.campaignNodeId/roguelikeRunId) — attached at read time
   * by GET /api/games/[id], mirrors web3's useGameIdToNodeId lookup so
   * GameDisplayWeb2's end-of-game screen can route back to the right place
   * instead of always falling back to plain PvP copy.
   */
  campaignNodeId?: number | null;
  roguelikeRunId?: number | null;
}

export interface Web2GameTurnState {
  currentTurn: string;
  turnTime: number;
  turnStartTime: number;
  currentRound: number;
}

export interface Web2GameGridDimensions {
  gridWidth: number;
  gridHeight: number;
}

export interface Web2ShipPosition {
  shipId: number;
  position: { row: number; col: number };
  isCreator: boolean;
  status?: 0 | 1 | 2;
  isPreview?: boolean;
}

export interface Web2LastMove {
  shipId: number;
  oldRow: number;
  oldCol: number;
  newRow: number;
  newCol: number;
  actionType: ActionType;
  targetShipId: number;
  timestamp: number;
}

export interface Web2GameDataView {
  metadata: Web2GameMetadata;
  turnState: Web2GameTurnState;
  gridDimensions: Web2GameGridDimensions;
  mapId: number;
  maxScore: number;
  creatorScore: number;
  joinerScore: number;
  shipIds: number[];
  shipAttributes: Attributes[];
  shipPositions: Web2ShipPosition[];
  creatorActiveShipIds: number[];
  joinerActiveShipIds: number[];
  creatorMovedShipIds: number[];
  joinerMovedShipIds: number[];
  lastMove?: Web2LastMove;
}

/** Response shape of GET /api/games/[id]/replay — a `GameTurn` row projection. */
export interface Web2GameReplayTurn {
  id: number;
  playerId: string;
  round: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any;
  snapshot: Web2GameDataView | null;
  submittedAt: string;
}

export interface Web2GameReplay {
  initialState: Web2GameDataView | null;
  turns: Web2GameReplayTurn[];
}

/** Winner sentinel for a tied game (web2-native; see no-crossover rule — never a fake `0x...` address). */
export const WEB2_TIE_SENTINEL = "__TIE__";
