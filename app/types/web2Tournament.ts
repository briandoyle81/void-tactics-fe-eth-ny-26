// Web2-mode tournament types. Parallel to (never sharing a definition with)
// the web3 `TournamentConfig`/`TournamentSummary`/`TournamentMatch` types in
// `./types.ts`, which model on-chain data (`bigint` ids/fees, `0x${string}`
// addresses). Web2 tournaments are Prisma-backed rows keyed by plain integer
// ids, owned by NextAuth user ids (Google OAuth subs) — see
// `app/types/web2Lobby.ts` for why the two systems never interoperate.
//
// Sybil resistance is "one registration per Google account" (a DB unique
// constraint) instead of a World ID proof; entry fee/prize pool are the
// existing in-app credit balance instead of on-chain ETH escrow, paid out
// directly on finalize instead of via a pull-based claim step.

export enum Web2TournamentState {
  Registration,
  Active,
  Complete,
  Cancelled,
}

export interface Web2TournamentConfig {
  entryFee: number; // credits
  minPlayers: number;
  maxPlayers: number; // 2 / 4 / 8 / 16
  registerBy: number; // ms epoch
  costLimit: number;
  turnTimeSeconds: number;
  selectedMapId: number;
  maxScore: number;
}

export interface Web2TournamentSummary {
  id: number;
  creator: string;
  state: Web2TournamentState;
  prizePool: number;
  registrantCount: number;
  totalRounds: number | null;
  championId: string | null;
  runnerUpId: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface Web2Tournament {
  config: Web2TournamentConfig;
  summary: Web2TournamentSummary;
}

export interface Web2TournamentMatch {
  id: number;
  round: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  isBye: boolean;
  resolved: boolean;
  lobbyId: number | null;
}

export interface Web2TournamentDetail extends Web2Tournament {
  registrants: string[]; // userIds, in registration order
  isRegistered: boolean;
  bracket: Web2TournamentMatch[];
}
