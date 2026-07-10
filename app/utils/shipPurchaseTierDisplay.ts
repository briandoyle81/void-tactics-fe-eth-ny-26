// Shared between ShipPurchaseInterface.tsx (web3) and
// ShipPurchaseInterfaceWeb2.tsx (web2) — pure display math for purchase
// tier cards (colors, callouts, badges, guaranteed-rank labels). No
// contract/API dependency and no bigint/number distinction, so this is a
// single shared module, not a twin (same rationale as
// fleetCompositionStorage.ts's `reorderByFleetComposition`).

export interface TierColorScheme {
  border: string;
  text: string;
  hoverBorder: string;
  hoverText: string;
  hoverBg: string;
}

export const TIER_COLOR_SCHEMES: readonly TierColorScheme[] = [
  {
    border: "border-text-muted",
    text: "text-text-muted",
    hoverBorder: "hover:border-text-secondary",
    hoverText: "hover:text-text-secondary",
    hoverBg: "hover:bg-text-muted/10",
  },
  {
    border: "border-phosphor-green",
    text: "text-phosphor-green",
    hoverBorder: "hover:border-phosphor-green",
    hoverText: "hover:text-phosphor-green",
    hoverBg: "hover:bg-phosphor-green/10",
  },
  {
    border: "border-cyan",
    text: "text-cyan",
    hoverBorder: "hover:border-cyan",
    hoverText: "hover:text-cyan",
    hoverBg: "hover:bg-cyan/10",
  },
  {
    border: "border-purple",
    text: "text-purple",
    hoverBorder: "hover:border-purple",
    hoverText: "hover:text-purple",
    hoverBg: "hover:bg-purple/10",
  },
  {
    border: "border-amber",
    text: "text-amber",
    hoverBorder: "hover:border-amber",
    hoverText: "hover:text-amber",
    hoverBg: "hover:bg-amber/10",
  },
] as const;

export const TIER_CALLOUTS: readonly string[] = [
  "ENTRY PACK",
  "STARTER BOOST",
  "BALANCED VALUE",
  "VETERAN CORE",
  "FLAGSHIP PACK",
] as const;

export function getTierColors(tier: number): TierColorScheme {
  return TIER_COLOR_SCHEMES[tier % TIER_COLOR_SCHEMES.length]!;
}

export function getTierCallout(tier: number): string {
  return TIER_CALLOUTS[tier] ?? `TIER ${tier} PACK`;
}

export function getTierBadge(tier: number, tierCount: number): string | null {
  if (tierCount <= 0) return null;
  if (tier === tierCount - 1) return "BEST VALUE";
  if (tierCount >= 2 && tier === tierCount - 2) return "MOST POPULAR";
  return null;
}

/** Guaranteed rank per ship slot in a tier, highest rank first (capped at R5). */
export function getGuaranteedRankNumbers(tier: number, shipsInTier: number): number[] {
  const startRank = Math.min(tier + 1, 5);
  return Array.from({ length: shipsInTier }, (_, i) => Math.max(1, startRank - i));
}

export function getGuaranteedRanksDisplay(tier: number, shipsInTier: number): string[] {
  return getGuaranteedRankNumbers(tier, shipsInTier)
    .filter((r) => r > 1)
    .map((r) => `R${r}`);
}

/**
 * Pack preview art only (not full fleet count). Entry pack: single R1. Other
 * tiers: veterans only (rank greater than 1), no R1 filler in the strip.
 */
export function getPreviewDisplayRanks(tier: number, shipsInTier: number): number[] {
  const ranks = getGuaranteedRankNumbers(tier, shipsInTier);
  if (tier === 0) return [1];
  return ranks.filter((r) => r > 1);
}
