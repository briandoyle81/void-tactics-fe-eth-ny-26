// Special ability config (mirrors the web3 contract's ShipAttributes
// specials — web3 fetches this from the SHIP_ATTRIBUTES contract via
// useSpecialRange/useSpecialData; web2 has no contract, so this is the
// static source of truth, shared by the client (GameDisplayWeb2.tsx, for
// range highlighting/preview) and the server (gameEngineWeb2.ts, for
// applying special effects).
//
// `getSpecialRange`/`getSpecialData` take a ship `traits.variant` argument
// on-chain (added in a later redeploy — see useSpecialRange.ts's doc) but
// direct on-chain reads across every valid variant (1, 2, 3 — 0 reverts,
// out of range) return IDENTICAL range/strength for each special, so a
// flat, variant-blind table here is correct, not an oversight: there is no
// per-variant special data to lose by keeping this shape. The VALUES below
// were stale relative to that same redeploy though (this table predates
// it and was never resynced) — corrected via a direct `cast call` against
// the live Base Sepolia ShipAttributes contract on 2026-08-05. `movement`
// (a third field on-chain, always 0 for every special/variant combination
// checked) is omitted since nothing here reads it.
export const SPECIAL_CONFIG: Record<number, { range: number; strength: number }> = {
  1: { range: 1, strength: 1 }, // EMP: adds a status effect + reactor-critical stack, not HP damage — `strength` isn't currently read for its effect magnitude
  2: { range: 3, strength: 40 }, // Repair: heals 40 HP
  3: { range: 3, strength: 30 }, // Flak: damage comes from the firing ship's own gun stats (applyShootDamage), not this `strength` — only `range` is load-bearing here
};
