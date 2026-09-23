// Live per-variant rank config (kill thresholds + hull/range/etc. bonus
// percentages) — see docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
// §1.2/§8: as of the 2026-09-20/21 redesign these are admin-editable data
// on both sides (`ShipAttributes.setVariantAttributes` on-chain,
// `/api/admin/ship-attribute-tables` in web2), not hardcoded constants.
//
// `shipLevel.ts`'s rank display (ship-card badges, the navy rank filter,
// canvas rank stars) is used from dozens of call sites across both modes,
// almost none of which have a wagmi/React-Query hook round trip readily at
// hand. Rather than thread a `rankConfig` prop through every one of them,
// this is a small synchronous read-through cache: `useRankConfigSync`
// (web3, on-chain) and `useRankConfigSyncWeb2` (web2, DB-backed) each
// mount once near the app root (see providers.tsx) and keep it warm;
// `getRankConfig` reads whatever's cached, falling back to
// DEFAULT_RANK_CONFIG (today's on-chain/DB default values) before the
// first fetch resolves or for a variant that was never configured.
//
// One shared cache keyed only by variant (not by mode) is deliberate: the
// web2/web3 parity mandate means a variant's numbers are meant to match
// across modes, and a given ship object only ever belongs to one mode
// anyway, so there's no real scenario where the "wrong" mode's value would
// be read.
export interface RankConfig {
  thresholds: number[];
  bonusPct: number[];
}

export const DEFAULT_RANK_CONFIG: RankConfig = {
  thresholds: [10, 30, 100, 300, 1000],
  bonusPct: [0, 10, 20, 30, 40, 50],
};

const cache = new Map<number, RankConfig>();

export function getRankConfig(variant: number): RankConfig {
  return cache.get(variant) ?? DEFAULT_RANK_CONFIG;
}

export function setRankConfig(variant: number, config: RankConfig): void {
  if (config.thresholds.length === 0 || config.bonusPct.length === 0) return;
  cache.set(variant, { thresholds: [...config.thresholds], bonusPct: [...config.bonusPct] });
}
