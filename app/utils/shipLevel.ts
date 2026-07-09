import { ShipVisual } from "../types/shipVisual";

/**
 * Calculate ship rank based on ships destroyed
 * Uses new threshold-based system:
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

  let rank: number;

  if (shipsDestroyed < 10) {
    rank = 1;
  } else if (shipsDestroyed < 30) {
    rank = 2;
  } else if (shipsDestroyed < 100) {
    rank = 3;
  } else if (shipsDestroyed < 300) {
    rank = 4;
  } else if (shipsDestroyed < 1000) {
    rank = 5;
  } else {
    rank = 6; // 1000+ kills
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

  let nextRankThreshold: number | null = null;
  if (rank === 1) nextRankThreshold = 10;
  else if (rank === 2) nextRankThreshold = 30;
  else if (rank === 3) nextRankThreshold = 100;
  else if (rank === 4) nextRankThreshold = 300;
  else if (rank === 5) nextRankThreshold = 1000;

  return {
    rank,
    shipsDestroyed,
    nextRank: rank < 6 ? rank + 1 : null,
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
