import { GRID_DIMENSIONS } from "../types/types";

/** Onchain turn timer when creating an Immediate game lobby. */
export const IMMEDIATE_GAME_TURN_SECONDS = 5 * 60;
/** Onchain turn timer when creating a Correspondence game lobby. */
export const CORRESPONDENCE_GAME_TURN_SECONDS = 24 * 60 * 60;

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

export const SKIRMISH_THREAT_LIMIT = 1000;
export const BATTLE_THREAT_LIMIT = 2000;

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

export const SHORT_MAX_SCORE = 50;
export const MEDIUM_MAX_SCORE = 100;
export const LONG_MAX_SCORE = 200;

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

export const VOID_TACTICS_ALPHA_DISCORD_INVITE = "https://discord.gg/SPzndFWvHZ";

/** Minimum owned and constructed ships required to use lobbies. */
export const MIN_SHIPS_FOR_LOBBIES = 10;

/** Matches `findNextPosition`: 4 deployment columns per side × grid height. */
export const FLEET_DEPLOY_ZONE_COLUMNS = 4;
export const MAX_SHIPS_PER_FLEET =
  FLEET_DEPLOY_ZONE_COLUMNS * GRID_DIMENSIONS.HEIGHT;
