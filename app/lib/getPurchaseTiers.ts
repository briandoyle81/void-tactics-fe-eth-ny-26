import { prisma } from "./prisma";
import { PURCHASE_TIERS, type PurchaseTier } from "./purchaseTiers";
import { createTtlCache } from "./ttlCache";

/**
 * The authoritative tier list is stored in the DB Config table (key:
 * "purchase_tiers") and managed via the (web2) Purchase Prices admin panel —
 * mirrors getCurrentCosts.ts's pattern. PURCHASE_TIERS (in purchaseTiers.ts,
 * a pure/client-safe file with no prisma import) is the fallback default
 * when the DB has no config row yet.
 */
const cache = createTtlCache<PurchaseTier[]>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "purchase_tiers" } });
  return row ? (row.value as unknown as PurchaseTier[]) : PURCHASE_TIERS;
}, 30_000);

export const getPurchaseTiers = cache.get;
export const invalidatePurchaseTiers = cache.invalidate;
