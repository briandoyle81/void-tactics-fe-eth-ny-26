import { prisma } from "./prisma";
import { DEFAULT_ATTRIBUTE_TABLES, type ShipAttributeTables } from "./shipAttributeTables";
import { createTtlCache } from "./ttlCache";

const cache = createTtlCache<ShipAttributeTables>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "ship_attribute_tables" } });
  return row ? (row.value as unknown as ShipAttributeTables) : DEFAULT_ATTRIBUTE_TABLES;
}, 30_000);

export const getShipAttributeTables = cache.get;
export const invalidateShipAttributeTables = cache.invalidate;
