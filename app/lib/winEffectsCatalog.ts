// Client-safe win-effect catalog — pure constants/types only, no server
// imports (no `./prisma`). Split out of winEffectsWeb2.ts because that
// file imports prisma, and a "use client" component (WinEffectsPickerWeb2)
// needs these values at runtime, not just as types — a value import from a
// prisma-importing module drags the whole pg/Prisma driver into the client
// bundle. winEffectsWeb2.ts re-exports these for server-side callers.
export const WIN_EFFECT_KEYS = [
  "DEC_BONUS_WIN_EFFECT",
  "HEAL_ABOVE_FLOOR_WIN_EFFECT",
  "SHIP_GRANT_WIN_EFFECT",
] as const;
export type WinEffectKey = (typeof WIN_EFFECT_KEYS)[number];

export const WIN_EFFECT_LABELS: Record<WinEffectKey, string> = {
  DEC_BONUS_WIN_EFFECT: "DEC Bonus",
  HEAL_ABOVE_FLOOR_WIN_EFFECT: "Heal Above Floor",
  SHIP_GRANT_WIN_EFFECT: "Grant Ship",
};

// HEAL_ABOVE_FLOOR_WIN_EFFECT is defined above for config/UI parity only —
// applyWinEffects() (winEffectsWeb2.ts) does not act on it yet. See that
// file's module doc for why.
export const IMPLEMENTED_WIN_EFFECT_KEYS: readonly WinEffectKey[] = [
  "DEC_BONUS_WIN_EFFECT",
  "SHIP_GRANT_WIN_EFFECT",
];

export function isWinEffectKey(value: unknown): value is WinEffectKey {
  return typeof value === "string" && (WIN_EFFECT_KEYS as readonly string[]).includes(value);
}
