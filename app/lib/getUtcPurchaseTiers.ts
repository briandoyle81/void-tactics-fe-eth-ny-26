import { prisma } from "./prisma";
import { UTC_PURCHASE_TIERS, type UtcPurchaseTier } from "./utcPurchaseTiers";
import { createTtlCache } from "./ttlCache";

/**
 * The authoritative UTC-purchase tier list is stored in the DB Config table
 * (key: "utc_purchase_tiers") and managed via the "UTC packs" section of the
 * (web2) Purchase Prices admin panel — mirrors getPurchaseTiers.ts's
 * pattern, but for the direct "buy UTC with USD" flow rather than ship
 * packs. UTC_PURCHASE_TIERS is the fallback default when the DB has no
 * config row yet.
 */
const cache = createTtlCache<UtcPurchaseTier[]>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "utc_purchase_tiers" } });
  return row ? (row.value as unknown as UtcPurchaseTier[]) : UTC_PURCHASE_TIERS;
}, 30_000);

export const getUtcPurchaseTiers = cache.get;
export const invalidateUtcPurchaseTiers = cache.invalidate;
