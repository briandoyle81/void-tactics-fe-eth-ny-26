/**
 * Whether a variant's innate faction ability (dispatched as
 * `ActionType.FactionAbility`) heals rather than rams — variant 1's is Ram,
 * variant 2's is Repair.
 *
 * `Game.factionAbilityIsHeal(variant)` — which this used to read live — was
 * removed from the contract in the 2026-09-20/21 AI redesign (each
 * variant's AI now knows its own faction directly, so the generic getter
 * was dropped; see
 * docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §7
 * / docs/ai-behavior-registry.md's "ABI changes" section). There is no
 * on-chain source for this any more, and no indication a variant's ability
 * *kind* (heal vs. ram) will ever change independently of redeploying that
 * variant's whole faction ability resolver — `RamResolver` (variant 1) and
 * `RepairResolver` (variant 2) are wired in once, at deploy, via
 * `Game.setFactionAbilityResolver`. This mirrors that same fixed mapping
 * client-side instead of making a doomed call to a function that no longer
 * exists (which would silently read as `false`/Ram for every variant,
 * including 2 — the exact live bug this replaced).
 */
export function useFactionAbilityIsHeal(variant: number | undefined) {
  return { isHeal: variant === 2, isLoading: false };
}
