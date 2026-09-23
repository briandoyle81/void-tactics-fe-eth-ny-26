import { NextResponse } from "next/server";
import { getShipAttributeTablesByVariant } from "@/app/lib/getShipAttributeTables";

// GET /api/ship-rank-config — read-only per-variant rankThresholds/
// rankBonusPct, for client-side rank display (ship-card badges, canvas
// rank stars, the navy rank filter) to stay correct after an admin edits
// them via /api/admin/ship-attribute-tables. Unauthenticated on purpose:
// this is display config, not user data — the same information a web3
// client gets for free from ShipAttributes.getVariantAttributes, a public
// contract read with no ownership check either.
export async function GET() {
  const tablesByVariant = await getShipAttributeTablesByVariant();
  const result: Record<number, { rankThresholds: number[]; rankBonusPct: number[] }> = {};
  for (const [variant, tables] of Object.entries(tablesByVariant)) {
    result[Number(variant)] = {
      rankThresholds: tables.rankThresholds,
      rankBonusPct: tables.rankBonusPct,
    };
  }
  return NextResponse.json(result);
}
