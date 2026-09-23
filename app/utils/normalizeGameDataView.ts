import { ActionType, GameDataView } from "../types/types";

// Raw on-chain Game.ActionType only goes up to FactionAbility=5. Our shared
// ActionType enum additionally carries web2-only ClaimPoints=5/Ram=6 (see
// the enum's doc comment in types.ts), so a raw on-chain 5 must be remapped
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
 * `FactionAbility` is numbered 7 to avoid colliding with `ClaimPoints`/`Ram`
 * (web2-only values, never submitted on-chain) — submitting that 7 directly
 * would revert. Every real web3 `moveShip` call must pass its
 * `computedActionType` through this first.
 */
export function toOnChainActionType(actionType: ActionType): number {
  if (actionType === ActionType.FactionAbility) return RAW_ONCHAIN_FACTION_ABILITY;
  return actionType;
}
