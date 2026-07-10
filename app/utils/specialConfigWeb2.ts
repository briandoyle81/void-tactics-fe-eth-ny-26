// Special ability config (mirrors the web3 contract's ShipAttributes v1
// specials — web3 fetches this from the SHIP_ATTRIBUTES contract via
// useSpecialRange/useSpecialData; web2 has no contract, so this is the
// static source of truth, shared by the client (GameDisplayWeb2.tsx, for
// range highlighting/preview) and the server (gameEngineWeb2.ts, for
// applying special effects).
export const SPECIAL_CONFIG: Record<number, { range: number; strength: number }> = {
  1: { range: 3, strength: 0 }, // EMP: no HP damage, adds status effect
  2: { range: 2, strength: 30 }, // Repair: heals 30 HP
  3: { range: 3, strength: 50 }, // Flak: deals 50 damage, ignores LOS
};
