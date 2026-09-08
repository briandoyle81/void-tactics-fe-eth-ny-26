// Web2 counterpart to the on-chain DroneStorefront's seeded tier ladder
// (docs/faction-2.md §3). Web3 makes this owner-adjustable via `addTier`;
// this is a fixed constant matching the seeded defaults rather than an
// admin-editable table — a deliberate scope cut for this pass (flag for a
// follow-up if the ladder ever needs live tuning without a deploy).
// Index 0 is unused (tier numbering starts at 1) so `TIER_COSTS[tier]`
// reads naturally.
export const TIER_COSTS: readonly number[] = [
  0, // unused
  10, 20, 30, 55, 95, 170, 300, 525, 925, 1625,
];

export const MAX_TIER = TIER_COSTS.length - 1;

/** Bonus ships/claim after reaching `tier` — equals the tier number itself. */
export function bonusForTier(tier: number): number {
  return tier;
}

/** Cost in DEC of the next tier after `currentTier`, or null past the last configured tier. */
export function nextTierCost(currentTier: number): number | null {
  const next = currentTier + 1;
  if (next > MAX_TIER) return null;
  return TIER_COSTS[next];
}
