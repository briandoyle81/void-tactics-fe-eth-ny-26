import { Attributes } from "./types";

// Minimal web2-mode game types — just enough to create a Game row from an
// accepted lobby (see app/lib/createGameFromLobby.ts). This is NOT the full
// games subsystem: no turn-submission/replay/display types live here yet.
// Parallel to (never sharing a definition with) the web3 `GameDataView` and
// friends in `./types.ts`, for the same reasons as `Web2Ship`/`Web2Lobby`.
// `Attributes` has no bigint/address fields, so it's shared as-is.

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

export interface Web2GameDataView {
  metadata: Web2GameMetadata;
  turnState: Web2GameTurnState;
  gridDimensions: Web2GameGridDimensions;
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
}
