export interface PurchaseTier {
  tier: number;
  shipCount: number;
  priceUsdCents: number;
  priceUtc: number;
}

export const PURCHASE_TIERS: PurchaseTier[] = [
  { tier: 0, shipCount:  5, priceUsdCents:  499, priceUtc:  499 },
  { tier: 1, shipCount: 11, priceUsdCents:  999, priceUtc:  999 },
  { tier: 2, shipCount: 22, priceUsdCents: 1999, priceUtc: 1999 },
  { tier: 3, shipCount: 40, priceUsdCents: 3499, priceUtc: 3499 },
  { tier: 4, shipCount: 60, priceUsdCents: 4999, priceUtc: 4999 },
];

export function getKillsForRank(rank: number): number {
  if (rank >= 6) return 1000;
  if (rank === 5) return 300;
  if (rank === 4) return 100;
  if (rank === 3) return 30;
  if (rank === 2) return 10;
  return 1;
}

export function getGuaranteedKillsForTierShip(tier: number, shipIndex: number): number {
  const tierRankCount = tier + 1;
  if (shipIndex < tierRankCount) {
    return getKillsForRank(tier + 1 - shipIndex);
  }
  return 0;
}
