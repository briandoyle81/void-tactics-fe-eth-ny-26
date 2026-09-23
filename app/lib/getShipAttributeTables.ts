import { prisma } from "./prisma";
import { defaultAttributeTablesForVariant, type ShipAttributeTables } from "./shipAttributeTables";
import { createKeyedTtlCache } from "./ttlCache";

/** Config row key for a variant's attribute tables — "ship_attribute_tables" (bare, no suffix) was variant 1's key before the 2026-09-20/21 per-variant redesign; kept as-is for variant 1 so existing rows don't need a migration. */
function configKeyForVariant(variant: number): string {
  return variant === 1 ? "ship_attribute_tables" : `ship_attribute_tables_v${variant}`;
}

const cache = createKeyedTtlCache<number, ShipAttributeTables>(async (variant) => {
  const row = await prisma.config.findUnique({ where: { key: configKeyForVariant(variant) } });
  return row ? (row.value as unknown as ShipAttributeTables) : defaultAttributeTablesForVariant(variant);
}, 30_000);

export const getShipAttributeTables = cache.get;
export const invalidateShipAttributeTables = cache.invalidate;
export { configKeyForVariant as attributeTablesConfigKeyForVariant };

/** Only variants 1-2 exist today — fetches both so a caller working with a mixed-variant batch of ships doesn't need to sequence two separate awaits itself. */
export async function getShipAttributeTablesByVariant(): Promise<Record<number, ShipAttributeTables>> {
  const [v1, v2] = await Promise.all([getShipAttributeTables(1), getShipAttributeTables(2)]);
  return { 1: v1, 2: v2 };
}
