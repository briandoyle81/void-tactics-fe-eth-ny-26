import { ShipVisual } from "../types/shipVisual";
import { getRankConfig } from "./rankConfigCache";

/**
 * Calculate ship rank based on ships destroyed, using the ship's own
 * variant's live rank thresholds (see rankConfigCache.ts) — falls back to
 * today's on-chain/DB defaults before that cache is warm:
 * 0-9 kills → Rank 1 (0% bonus)
 * 10-29 kills → Rank 2 (10% bonus)
 * 30-99 kills → Rank 3 (20% bonus)
 * 100-299 kills → Rank 4 (30% bonus)
 * 300-999 kills → Rank 5 (40% bonus)
 * 1000+ kills → Rank 6 (50% bonus)
 */
export function calculateShipRank(ship: ShipVisual): {
  rank: number;
  shipsDestroyed: number;
} {
  const shipsDestroyed = ship.shipData.shipsDestroyed;
  const { thresholds } = getRankConfig(ship.traits.variant);

  // thresholds[i] is the kill count needed for rank i+2 (rank 1 has no
  // threshold — every ship starts there). Mirrors the contract's
  // ShipAttributes.getRank / shipAttributesCalculator.ts's getRankFromKills.
  let rank = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (shipsDestroyed >= thresholds[i]) rank = i + 2;
  }

  return {
    rank,
    shipsDestroyed,
  };
}

export function getRankProgressInfo(ship: ShipVisual): {
  rank: number;
  shipsDestroyed: number;
  nextRank: number | null;
  killsToNextRank: number | null;
} {
  const { rank, shipsDestroyed } = calculateShipRank(ship);
  const { thresholds, bonusPct } = getRankConfig(ship.traits.variant);
  const maxRank = bonusPct.length; // fixed at 6 by the contract's array-length validation

  // thresholds[rank - 1] is the kill count for the *next* rank (thresholds
  // has one fewer entry than there are ranks, since rank 1 needs none).
  const nextRankThreshold: number | null =
    rank <= thresholds.length ? thresholds[rank - 1] : null;

  return {
    rank,
    shipsDestroyed,
    nextRank: rank < maxRank ? rank + 1 : null,
    killsToNextRank:
      nextRankThreshold == null ? null : Math.max(0, nextRankThreshold - shipsDestroyed),
  };
}

/**
 * Calculate ship tier based on average stats
 * Uses the same logic as useNavyAnalytics.ts
 */
export function calculateShipTier(ship: ShipVisual): {
  tier: string;
  numericTier: number;
  averageStat: number;
} {
  const averageStat =
    (ship.traits.accuracy + ship.traits.hull + ship.traits.speed) / 3;

  let tier: string;
  let numericTier: number;

  if (averageStat >= 80) {
    tier = "S";
    numericTier = 4;
  } else if (averageStat >= 65) {
    tier = "A";
    numericTier = 3;
  } else if (averageStat >= 50) {
    tier = "B";
    numericTier = 2;
  } else {
    tier = "C";
    numericTier = 1;
  }

  return {
    tier,
    numericTier,
    averageStat: Math.round(averageStat),
  };
}

/**
 * Get rank color for styling
 */
export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "text-text-muted border-text-muted bg-text-muted/20";
    case 2:
      return "text-phosphor-green border-phosphor-green bg-phosphor-green/20";
    case 3:
      return "text-cyan border-cyan bg-cyan/20";
    case 4:
      return "text-purple border-purple bg-purple/20";
    case 5:
      return "text-amber border-amber bg-amber/20";
    case 6:
      return "text-warning-red border-warning-red bg-warning-red/20";
    default:
      return "text-text-muted border-text-muted bg-text-muted/20";
  }
}

/**
 * CSS custom-property accent color for a ship's rank — same low-to-high
 * color scheme as `getRankColor` above (and as purchase-tier colors in
 * `shipPurchaseTierDisplay.ts`'s TIER_COLOR_SCHEMES: rank N uses the same
 * hue as tier N-1), returned as a single `var(--color-...)` string for
 * inline-style consumers (ShipCard.tsx's card border) instead of a Tailwind
 * class bundle.
 */
export function getRankColorVar(rank: number): string {
  switch (rank) {
    case 1:
      return "var(--color-text-muted)";
    case 2:
      return "var(--color-phosphor-green)";
    case 3:
      return "var(--color-cyan)";
    case 4:
      return "var(--color-purple)";
    case 5:
      return "var(--color-amber)";
    default:
      return "var(--color-warning-red)";
  }
}

/**
 * Get tier color for styling
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case "S":
      return "text-purple border-purple bg-purple/20";
    case "A":
      return "text-cyan border-cyan bg-cyan/20";
    case "B":
      return "text-phosphor-green border-phosphor-green bg-phosphor-green/20";
    case "C":
      return "text-amber border-amber bg-amber/20";
    default:
      return "text-text-muted border-text-muted bg-text-muted/20";
  }
}
