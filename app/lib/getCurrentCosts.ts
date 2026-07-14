import { prisma } from "./prisma";
import { DEFAULT_COSTS, type CostsConfig } from "./shipCosts";
import { createTtlCache } from "./ttlCache";

const cache = createTtlCache<CostsConfig>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "ship_costs" } });
  return row ? (row.value as CostsConfig) : DEFAULT_COSTS;
}, 30_000);

export const getCurrentCosts = cache.get;
export const invalidateCurrentCosts = cache.invalidate;
