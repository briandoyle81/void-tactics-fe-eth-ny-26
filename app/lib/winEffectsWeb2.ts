import { prisma } from "./prisma";
import { createTtlCache } from "./ttlCache";
import { generateShip, calcShipCost } from "./shipGen";
import { getCurrentCosts } from "./getCurrentCosts";
import { validSpecialsForVariant } from "../types/types";
import type { Web2ShipEquipment } from "../types/web2Ship";

// Web2 counterpart to the on-chain pluggable win effects (contracts/
// IWinEffect.sol — DECBonusWinEffect/HealAboveFloorWinEffect/
// ShipGrantWinEffect), assignable to roguelike combat nodes
// (RoguelikeNode.winEffects), PvP games, and tournament champions. Same
// three keys as useWinEffects.ts's WIN_EFFECT_CATALOG so admin UI and node
// config speak one vocabulary across both flows.
//
// HEAL_ABOVE_FLOOR_WIN_EFFECT is defined here for config/UI parity only —
// applyWinEffects() does not act on it yet. The on-chain onWin()'s second
// argument (whether it targets one ship or the whole winning fleet) needs
// confirming against the Solidity source (not in this repo) before its
// targeting can be replicated correctly; wiring it in now would guess at
// game-balance-affecting behavior.
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

export const IMPLEMENTED_WIN_EFFECT_KEYS: readonly WinEffectKey[] = [
  "DEC_BONUS_WIN_EFFECT",
  "SHIP_GRANT_WIN_EFFECT",
];

export function isWinEffectKey(value: unknown): value is WinEffectKey {
  return typeof value === "string" && (WIN_EFFECT_KEYS as readonly string[]).includes(value);
}

export interface WinEffectsSettings {
  decBonusAmount: number;
  shipGrantVariant: number; // 0-2, matches Web2ShipTraits.variant's roll range
  shipGrantTier: number; // 0-3, minimum equipment level the grant guarantees
  healAboveFloorPercent: number; // stored for parity; not yet applied, see module doc
  healCapPercent: number; // 100 = uncapped — caps every heal effect (Repair special, win-effect heals) at this % of max HP
  pvpWinEffects: WinEffectKey[];
  tournamentWinEffects: WinEffectKey[];
}

export const DEFAULT_WIN_EFFECTS_SETTINGS: WinEffectsSettings = {
  decBonusAmount: 0,
  shipGrantVariant: 0,
  shipGrantTier: 0,
  healAboveFloorPercent: 100,
  healCapPercent: 100,
  pvpWinEffects: [],
  tournamentWinEffects: [],
};

const cache = createTtlCache<WinEffectsSettings>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "win_effects_settings" } });
  if (!row) return DEFAULT_WIN_EFFECTS_SETTINGS;
  const stored = row.value as Partial<WinEffectsSettings>;
  return { ...DEFAULT_WIN_EFFECTS_SETTINGS, ...stored };
}, 30_000);

export const getWinEffectsSettings = cache.get;
export const invalidateWinEffectsSettingsCache = cache.invalidate;

/**
 * Grants a freshly generated ship to `ownerId`. Web2 has no on-chain
 * "tier template" minting primitive (Ships.tierShips/tierPrices) to mirror
 * exactly, so this is a deliberate simplification: roll a normal random
 * ship via generateShip(), then force its variant to `variant` and raise
 * mainWeapon/its defense stat to at least `tier` (capped at 3) so the grant
 * always meets a minimum quality floor.
 */
async function grantShip(ownerId: string, variant: number, tier: number): Promise<void> {
  const costs = await getCurrentCosts();
  const rolled = generateShip(ownerId, Date.now() % 1000);

  const clampedVariant = Math.min(2, Math.max(0, variant));
  const clampedTier = Math.min(3, Math.max(0, tier));
  const validSpecials = validSpecialsForVariant(clampedVariant);

  const equipment: Web2ShipEquipment = {
    ...rolled.equipment,
    mainWeapon: Math.max(rolled.equipment.mainWeapon, clampedTier),
    armor: rolled.equipment.armor > 0 ? Math.max(rolled.equipment.armor, clampedTier) : 0,
    shields: rolled.equipment.shields > 0 ? Math.max(rolled.equipment.shields, clampedTier) : 0,
    special: validSpecials.includes(rolled.equipment.special) ? rolled.equipment.special : validSpecials[0]!,
  };
  const traits = { ...rolled.traits, variant: clampedVariant };
  const cost = calcShipCost(equipment, traits, costs);

  await prisma.ship.create({
    data: {
      ownerId,
      name: rolled.name,
      equipment: equipment as object,
      traits: traits as object,
      cost,
      costsVersion: costs.version,
      constructed: true,
      isFree: true,
    },
  });
}

/**
 * Applies the given subset of effect keys (already filtered to whichever
 * list is relevant — a node's own winEffects, or the global pvp/tournament
 * list) to `winnerId`. Silently skips HEAL_ABOVE_FLOOR_WIN_EFFECT — see
 * module doc.
 */
export async function applyWinEffects(effects: readonly string[], winnerId: string): Promise<void> {
  if (effects.length === 0) return;
  const settings = await getWinEffectsSettings();

  if (effects.includes("DEC_BONUS_WIN_EFFECT") && settings.decBonusAmount > 0) {
    await prisma.user.update({
      where: { id: winnerId },
      data: { decBalance: { increment: settings.decBonusAmount } },
    });
  }

  if (effects.includes("SHIP_GRANT_WIN_EFFECT")) {
    await grantShip(winnerId, settings.shipGrantVariant, settings.shipGrantTier);
  }
}
