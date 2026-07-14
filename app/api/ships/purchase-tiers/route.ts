import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth, requireWeb2Admin } from "@/app/lib/auth";
import { getPurchaseTiers, invalidatePurchaseTiers } from "@/app/lib/getPurchaseTiers";
import type { PurchaseTier } from "@/app/lib/purchaseTiers";

// GET /api/ships/purchase-tiers — the live (DB-backed, falls back to
// hardcoded defaults) ship-pack pricing tiers. Web2-mode counterpart to
// web3's Ships.getPurchaseInfo/ShipPurchaser.getPurchaseInfo reads.
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(await getPurchaseTiers());
}

function isValidTiers(value: unknown): value is PurchaseTier[] {
  return (
    Array.isArray(value) &&
    value.every(
      (t) =>
        t &&
        typeof t.tier === "number" &&
        typeof t.shipCount === "number" &&
        typeof t.priceUsdCents === "number" &&
        typeof t.priceUtc === "number",
    )
  );
}

// PUT /api/ships/purchase-tiers — admin-only write. Web2-mode counterpart to
// web3's Ships.setPurchaseInfo/ShipPurchaser.setPurchaseInfo, gated on
// WEB2_ADMIN_EMAILS instead of contract ownership.
export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  if (!isValidTiers(body)) {
    return NextResponse.json({ error: "Invalid tier list" }, { status: 400 });
  }

  await prisma.config.upsert({
    where: { key: "purchase_tiers" },
    create: { key: "purchase_tiers", value: body as unknown as object },
    update: { value: body as unknown as object },
  });
  invalidatePurchaseTiers();

  return NextResponse.json({ ok: true });
}
