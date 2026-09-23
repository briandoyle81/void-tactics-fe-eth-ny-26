import { prisma } from "./prisma";
import { defaultCostsForVariant, type CostsConfig } from "./shipCosts";
import { createKeyedTtlCache } from "./ttlCache";

/** Config row key for a variant's costs — "ship_costs" (bare, no suffix) was variant 1's key before the 2026-09-20/21 per-variant redesign; kept as-is for variant 1 so existing rows don't need a migration. */
function configKeyForVariant(variant: number): string {
  return variant === 1 ? "ship_costs" : `ship_costs_v${variant}`;
}

const cache = createKeyedTtlCache<number, CostsConfig>(async (variant) => {
  const row = await prisma.config.findUnique({ where: { key: configKeyForVariant(variant) } });
  return row ? (row.value as CostsConfig) : defaultCostsForVariant(variant);
}, 30_000);

export const getCurrentCosts = cache.get;
export const invalidateCurrentCosts = cache.invalidate;
export { configKeyForVariant as costsConfigKeyForVariant };

/** Only variants 1-2 are ever generated/purchased today (see shipGen.ts's roll range) — fetches both so a caller that doesn't know a ship's variant in advance (generateShip rolls its own) can pick the right one after the fact. */
export async function getCurrentCostsByVariant(): Promise<Record<number, CostsConfig>> {
  const [v1, v2] = await Promise.all([getCurrentCosts(1), getCurrentCosts(2)]);
  return { 1: v1, 2: v2 };
}
