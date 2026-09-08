import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth, requireWeb2Admin } from "@/app/lib/auth";
import { getUtcPurchaseTiers, invalidateUtcPurchaseTiers } from "@/app/lib/getUtcPurchaseTiers";
import type { UtcPurchaseTier } from "@/app/lib/utcPurchaseTiers";

// GET /api/utc/purchase-tiers — the live (DB-backed, falls back to hardcoded
// defaults) direct "buy UTC with USD" tier list. Web2-mode counterpart to
// web3's ShipPurchaser.getPurchaseInfo read (see ShipPurchasePrices.tsx's
// "UTC packs" section). Independent from ship-pack pricing
// (app/api/ships/purchase-tiers) — editing one does not affect the other.
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(await getUtcPurchaseTiers());
}

function isValidTiers(value: unknown): value is UtcPurchaseTier[] {
  return (
    Array.isArray(value) &&
    value.every(
      (t) =>
        t &&
        typeof t.tier === "number" &&
        typeof t.utcAmount === "number" &&
        typeof t.priceUsdCents === "number",
    )
  );
}

// PUT /api/utc/purchase-tiers — admin-only write. Web2-mode counterpart to
// web3's ShipPurchaser.setPurchaseInfo, gated on WEB2_ADMIN_EMAILS instead
// of contract ownership.
export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  if (!isValidTiers(body)) {
    return NextResponse.json({ error: "Invalid tier list" }, { status: 400 });
  }

  await prisma.config.upsert({
    where: { key: "utc_purchase_tiers" },
    create: { key: "utc_purchase_tiers", value: body as unknown as object },
    update: { value: body as unknown as object },
  });
  invalidateUtcPurchaseTiers();

  return NextResponse.json({ ok: true });
}
