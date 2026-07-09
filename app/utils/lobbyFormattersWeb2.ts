// Web2-mode counterpart to `lobbyFormatters.ts`'s number-formatting
// functions. The web3 versions take `bigint` (matching on-chain reads);
// web2 lobby fields are plain `number` from Prisma, so these are separate
// functions rather than forcing a shared bigint/number signature. The
// underlying threshold constants (and non-formatting exports like
// `MIN_SHIPS_FOR_LOBBIES`) have no identity/bigint concerns at all, so
// they're imported and reused as-is rather than duplicated.

import {
  IMMEDIATE_GAME_TURN_SECONDS,
  CORRESPONDENCE_GAME_TURN_SECONDS,
  SKIRMISH_THREAT_LIMIT,
  BATTLE_THREAT_LIMIT,
  SHORT_MAX_SCORE,
  MEDIUM_MAX_SCORE,
  LONG_MAX_SCORE,
} from "./lobbyFormatters";

export function formatLobbyTurnTimeDisplay(seconds: number): string {
  if (seconds === IMMEDIATE_GAME_TURN_SECONDS) {
    return "Immediate game, 5 minutes per turn";
  }
  if (seconds === CORRESPONDENCE_GAME_TURN_SECONDS) {
    return "Correspondence game, 24 hours per turn";
  }
  return `${seconds.toLocaleString()} s`;
}

export function formatTurnShort(seconds: number): string {
  if (seconds === IMMEDIATE_GAME_TURN_SECONDS) return "5 min";
  if (seconds === CORRESPONDENCE_GAME_TURN_SECONDS) return "24 hr";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function formatLobbyCostLimitDisplay(costLimit: number): string {
  if (costLimit === SKIRMISH_THREAT_LIMIT) {
    return "Skirmish, 1000 threat per fleet";
  }
  if (costLimit === BATTLE_THREAT_LIMIT) {
    return "Battle, 2000 threat per fleet";
  }
  return costLimit.toLocaleString();
}

export function formatThreatShort(costLimit: number): string {
  if (costLimit === SKIRMISH_THREAT_LIMIT) return "Skirmish (1K)";
  if (costLimit === BATTLE_THREAT_LIMIT) return "Battle (2K)";
  return costLimit.toLocaleString();
}

export function formatLobbyMaxScoreDisplay(maxScore: number): string {
  if (maxScore === SHORT_MAX_SCORE) {
    return "Short, 50 points to win";
  }
  if (maxScore === MEDIUM_MAX_SCORE) {
    return "Medium, 100 points to win";
  }
  if (maxScore === LONG_MAX_SCORE) {
    return "Long, 200 points to win";
  }
  return maxScore.toLocaleString();
}

export function formatScoreShort(maxScore: number): string {
  if (maxScore === SHORT_MAX_SCORE) return "50 pts (short)";
  if (maxScore === MEDIUM_MAX_SCORE) return "100 pts (medium)";
  if (maxScore === LONG_MAX_SCORE) return "200 pts (long)";
  return `${maxScore.toLocaleString()} pts`;
}
