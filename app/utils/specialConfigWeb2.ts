// Special ability config (mirrors the web3 contract's ShipAttributes
// specials — web3 fetches this from the SHIP_ATTRIBUTES contract via
// useSpecialRangeAt/useSpecialStrengthAt, web2 has no contract, so this is
// the static source of truth, shared by the client (GameDisplayWeb2.tsx,
// for range highlighting/preview) and the server (gameEngineWeb2.ts, for
// applying special effects; aiBehaviorWeb2.ts, for AI targeting).
//
// As of the 2026-09-20/21 attributes/costs redesign, Special is a per-
// faction local slot (1-7), not a global identity — slot 2 means Repair
// Drones for variant 1 but Drone Swarm for variant 2. This table is keyed
// by (variant, slot) accordingly; a flat slot-only table (the pre-redesign
// shape) would silently apply variant 1's ability to a variant 2 ship
// whose special happens to share the same slot number. See
// docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §3.
//
// Values verified against ignition/modules/DeployAndConfig.ts's
// setVariantAttributes calls (variant1Specials/variant2 specials arrays) —
// direct on-chain reads return identical numbers across every valid
// variant within its own faction, so this static table is correct, not an
// oversight.

export interface SpecialConfigEntry {
  range: number;
  strength: number;
  /** Passive movement bonus while equipped (e.g. variant 2's Additional Thruster); 0 for every other special. */
  movement: number;
}

const VARIANT_1_SPECIALS: Record<number, SpecialConfigEntry> = {
  1: { range: 1, strength: 1, movement: 0 }, // EMP: adds a status effect + reactor-critical stack, not HP damage — `strength` isn't currently read for its effect magnitude
  2: { range: 3, strength: 40, movement: 0 }, // Repair Drones: heals 40 HP
  3: { range: 3, strength: 30, movement: 0 }, // Flak Array: damage comes from the firing ship's own gun stats (applyShootDamage), not this `strength` — only `range` is load-bearing here
};

const VARIANT_2_SPECIALS: Record<number, SpecialConfigEntry> = {
  1: { range: 2, strength: 1, movement: 0 }, // Electric Storm: self-centered AoE, adds `strength` to every active ship's (both sides + self) reactor-critical stack
  2: { range: 5, strength: 40, movement: 0 }, // Drone Swarm: single-target hull damage against an enemy, reduced by the target's damage reduction
  3: { range: 0, strength: 0, movement: 3 }, // Additional Thruster: pure passive movement bonus — never dispatched as an action (no resolver on-chain either), see isActivatableSpecial below
};

/** Variant-1 shape, kept for the (currently only) callers that only have a bare special slot in scope with no ship/variant to hand — those pre-date the faction split and are variant-1-only contexts. */
export const SPECIAL_CONFIG = VARIANT_1_SPECIALS;

export function getSpecialConfigWeb2(variant: number, slot: number): SpecialConfigEntry | undefined {
  const table = Number(variant) === 2 ? VARIANT_2_SPECIALS : VARIANT_1_SPECIALS;
  return table[Number(slot)];
}

export function requireSpecialConfigWeb2(variant: number, slot: number): SpecialConfigEntry {
  const equipped = Number(slot);
  if (equipped === 0) {
    throw new Error(`Missing ship value: special (variant ${variant}, slot ${slot})`);
  }
  const entry = getSpecialConfigWeb2(variant, slot);
  if (!entry) {
    throw new Error(
      `Missing special config for variant ${variant} slot ${slot}`,
    );
  }
  return entry;
}

/**
 * Whether a (variant, slot) special can be used as an active ActionType.Special.
 * Matches Game.specialResolvers: only configured, non-passive slots. Variant 2
 * slot 3 (Additional Thruster) is passive-only. Leftover slots 4–7 have no
 * resolver and are not activatable.
 */
export function isActivatableSpecialWeb2(variant: number, slot: number): boolean {
  const equipped = Number(slot);
  if (equipped === 0) return false;
  if (Number(variant) === 2 && equipped === 3) return false;
  return getSpecialConfigWeb2(variant, slot) !== undefined;
}

export function shipHasActivatableSpecial(ship: {
  traits?: { variant?: number };
  equipment?: { special?: number };
} | null | undefined): boolean {
  if (!ship) return false;
  return isActivatableSpecialWeb2(
    Number(ship.traits?.variant ?? 0),
    Number(ship.equipment?.special ?? 0),
  );
}

/** True for a special resolved as a self-centered AoE hitting every active ship (both sides + the caster), not a single chosen target — Flak Array (v1 slot 3) and Electric Storm (v2 slot 1). */
export function isAoeSpecialWeb2(variant: number, slot: number): boolean {
  const equipped = Number(slot);
  return (Number(variant) !== 2 && equipped === 3) || (Number(variant) === 2 && equipped === 1);
}

/** Variant 2 slot 1: Lightening Field / Electric Storm. Hits every ship in range, including the caster. */
export function isLightningFieldSpecial(variant: number, slot: number): boolean {
  return Number(variant) === 2 && Number(slot) === 1;
}

/** Variant 1 slot 2: Repair Drones. Heals a friendly, including self. */
export function isRepairDronesSpecial(variant: number, slot: number): boolean {
  return Number(variant) !== 2 && Number(slot) === 2;
}

/** Variant 2 slot 2: Attack Drones / Drone Swarm. Single-target hull damage vs an enemy. */
export function isAttackDronesSpecial(variant: number, slot: number): boolean {
  return Number(variant) === 2 && Number(slot) === 2;
}
