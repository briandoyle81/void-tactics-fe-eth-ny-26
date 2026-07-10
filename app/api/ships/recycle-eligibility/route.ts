import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getEconomyConfig } from "@/app/lib/economyConfig";

// GET /api/ships/recycle-eligibility — the web2 counterpart to reading the
// Ships contract's `amountPurchased`/`recycleReward`: exposes the same
// purchase-count gate (`purchasedShipCount` vs `purchaseThresholdForRewards`)
// that the recycle routes already enforce server-side, so the client can
// show the same locked/unlocked UI as ManageNavy.tsx.
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [economy, user] = await Promise.all([
    getEconomyConfig(),
    prisma.user.findUnique({ where: { id: userId! }, select: { purchasedShipCount: true } }),
  ]);

  const purchasedShipCount = user?.purchasedShipCount ?? 0;

  return NextResponse.json({
    purchasedShipCount,
    threshold: economy.purchaseThresholdForRewards,
    rewardUtc: economy.recycleRewardUtc,
    canRecycle: purchasedShipCount >= economy.purchaseThresholdForRewards,
  });
}
