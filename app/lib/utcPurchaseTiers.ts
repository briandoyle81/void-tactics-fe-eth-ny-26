// Pure/client-safe defaults for the direct "buy UTC with USD" tier list —
// independent from ship-pack pricing (see purchaseTiers.ts). The DB-backed
// live tier list (admin-editable) lives in getUtcPurchaseTiers.ts. Defaults
// below reproduce the values this route used to derive from ship-pack tiers
// (shipCount * recycleRewardUtc, priceUsdCents copied from the matching ship
// tier) so the cutover to an independent tier list doesn't change live
// prices until an admin edits them.

export interface UtcPurchaseTier {
  tier: number;
  utcAmount: number;
  priceUsdCents: number;
}

export const UTC_PURCHASE_TIERS: UtcPurchaseTier[] = [
  { tier: 0, utcAmount: 5, priceUsdCents: 499 },
  { tier: 1, utcAmount: 11, priceUsdCents: 999 },
  { tier: 2, utcAmount: 22, priceUsdCents: 1999 },
  { tier: 3, utcAmount: 40, priceUsdCents: 3499 },
  { tier: 4, utcAmount: 60, priceUsdCents: 4999 },
];
