// Web2 mirror of RamResolver.sol/RepairResolver.sol's own state (range=1 for
// both; Repair's heal strength=50) — see useFactionAbilityConfig.ts's doc
// for why this is a separate table from specialConfigWeb2.ts: a faction
// ability (innate to every ship of that variant, dispatched via
// ActionType.FactionAbility) was never equipped, so it has no reason to
// share the equipped-Special config. Web2 has no contract to read these
// live from, so — like specialConfigWeb2.ts — this is the static source of
// truth, shared by the client (GameDisplayWeb2.tsx, range highlighting) and
// the server (gameEngineWeb2.ts, applying the effect).
export interface FactionAbilityConfig {
  range: number;
  strength?: number;
  isHeal: boolean;
}

const RAM_CONFIG: FactionAbilityConfig = { range: 1, isHeal: false };
const REPAIR_CONFIG: FactionAbilityConfig = { range: 1, strength: 50, isHeal: true };

export function getFactionAbilityConfigWeb2(variant: number): FactionAbilityConfig {
  return variant === 2 ? REPAIR_CONFIG : RAM_CONFIG;
}
