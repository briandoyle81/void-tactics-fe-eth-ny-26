// Number/string-native display-data shapes shared between GameDisplay.tsx
// (web3) and GameDisplayWeb2.tsx (web2) — same rationale as GridShip/
// GridShipPosition in ./gridDisplay.ts, extended to the score/turn/result
// chrome around the grid. Conversion from web3's bigint/address game data
// happens in app/utils/toGameDisplayData.ts; web2's data is already
// number/string-native, so app/utils/gameDisplayDataWeb2.ts just picks
// fields (no bigint ever flows through these types).

export interface GameScoreData {
  myScore: number;
  opponentScore: number;
  maxScore: number;
}

export interface GameTurnData {
  isMyTurn: boolean;
  secondsLeft: number;
}

/** `"tie"` only ever comes from web2 — web3's contract has no tie outcome. */
export type GameWinnerResult = "me" | "opponent" | "tie" | null;

export interface GameFleetCardData {
  shipId: number;
  name: string;
  hpPct: number;
  hasMoved: boolean;
  /** Disabled (0 HP) — shows the [SOS] badge/crossout. */
  isSOS: boolean;
}
