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
