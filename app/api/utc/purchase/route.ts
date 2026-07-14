import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getPurchaseTiers } from "@/app/lib/getPurchaseTiers";
import { getEconomyConfig } from "@/app/lib/economyConfig";

// GET/POST /api/utc/purchase — direct UTC purchase. Web2-mode counterpart to
// web3's UTCPurchaseModal (buy UTC directly, no ships involved). Uses the
// same tier list as ship-pack purchases for pricing (see getPurchaseTiers.ts)
// so the two purchase flows never drift out of sync, but the UTC payout per
// tier is `tier.shipCount * economy.recycleRewardUtc` — i.e. what a player
// would net from buying that tier's ships and recycling all of them — not
// `tier.priceUtc` (which is a different, unrelated number: the UTC price to
// buy ships directly, not what recycling that many ships would earn).
//
// Like `/api/ships/purchase/usd`, this has no real payment gate — it's a
// placeholder that credits UTC directly, matching that route's known,
// already-flagged limitation (see docs/web2-security-efficiency-audit.md,
// finding #1) rather than introducing a new one.
async function buildTierPreviews() {
  const [tiers, economy] = await Promise.all([getPurchaseTiers(), getEconomyConfig()]);
  return tiers.map((t) => ({
    tier: t.tier,
    shipCount: t.shipCount,
    priceUsdCents: t.priceUsdCents,
    utcAmount: t.shipCount * economy.recycleRewardUtc,
  }));
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json({ tiers: await buildTierPreviews() });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { tier } = await req.json() as { tier: number };
  const tierPreviews = await buildTierPreviews();
  const tierPreview = tierPreviews.find((t) => t.tier === tier);
  if (!tierPreview) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId! },
    data: { creditBalance: { increment: tierPreview.utcAmount } },
    select: { creditBalance: true },
  });

  return NextResponse.json(
    { utcEarned: tierPreview.utcAmount, creditBalance: user.creditBalance },
    { status: 201 },
  );
}
