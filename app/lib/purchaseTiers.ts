export interface PurchaseTier {
  tier: number;
  shipCount: number;
  priceUsdCents: number;
  priceUtc: number;
}

export const PURCHASE_TIERS: PurchaseTier[] = [
  { tier: 0, shipCount: 1,  priceUsdCents: 499,  priceUtc: 499  },
  { tier: 1, shipCount: 3,  priceUsdCents: 999,  priceUtc: 999  },
  { tier: 2, shipCount: 5,  priceUsdCents: 1499, priceUtc: 1499 },
  { tier: 3, shipCount: 8,  priceUsdCents: 1999, priceUtc: 1999 },
  { tier: 4, shipCount: 12, priceUsdCents: 2999, priceUtc: 2999 },
];
