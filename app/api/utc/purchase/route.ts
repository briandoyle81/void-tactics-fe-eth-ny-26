import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getUtcPurchaseTiers } from "@/app/lib/getUtcPurchaseTiers";

// GET/POST /api/utc/purchase — direct UTC purchase. Web2-mode counterpart to
// web3's UTCPurchaseModal (buy UTC directly, no ships involved). Priced from
// its own independent tier list (utc_purchase_tiers), editable via the
// "UTC packs" section of the Purchase Prices admin panel — see
// utcPurchaseTiers.ts / getUtcPurchaseTiers.ts. Deliberately independent
// from ship-pack pricing (getPurchaseTiers.ts) — the two flows can be
// priced differently now, same as web3's Ships vs ShipPurchaser split.
//
// Like `/api/ships/purchase/usd`, this has no real payment gate — it's a
// placeholder that credits UTC directly, matching that route's known,
// already-flagged limitation (see docs/web2-security-efficiency-audit.md,
// finding #1) rather than introducing a new one.

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json({ tiers: await getUtcPurchaseTiers() });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { tier } = await req.json() as { tier: number };
  const tiers = await getUtcPurchaseTiers();
  const tierData = tiers.find((t) => t.tier === tier);
  if (!tierData) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId! },
    data: { creditBalance: { increment: tierData.utcAmount } },
    select: { creditBalance: true },
  });

  return NextResponse.json(
    { utcEarned: tierData.utcAmount, creditBalance: user.creditBalance },
    { status: 201 },
  );
}
