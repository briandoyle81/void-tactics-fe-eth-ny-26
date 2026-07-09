import { prisma } from "./prisma";
import { DEFAULT_COSTS, type CostsConfig } from "./shipCosts";

export async function getCurrentCosts(): Promise<CostsConfig> {
  const row = await prisma.config.findUnique({ where: { key: "ship_costs" } });
  return row ? (row.value as CostsConfig) : DEFAULT_COSTS;
}
