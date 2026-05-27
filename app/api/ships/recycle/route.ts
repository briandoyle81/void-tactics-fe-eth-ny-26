import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getEconomyConfig } from "@/app/lib/economyConfig";

// POST /api/ships/recycle
// Body: { shipIds: number[] }
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { shipIds } = await req.json() as { shipIds: number[] };
  if (!shipIds || shipIds.length === 0) {
    return NextResponse.json({ error: "No ship IDs provided" }, { status: 400 });
  }

  // Fetch ships to validate ownership and free status
  const ships = await prisma.ship.findMany({
    where: { id: { in: shipIds }, ownerId: userId!, inFleet: false },
    select: { id: true, isFree: true },
  });

  const freeShipIds = ships.filter((s) => s.isFree).map((s) => s.id);
  if (freeShipIds.length > 0) {
    return NextResponse.json(
      { error: "Free ships cannot be recycled", freeShipIds },
      { status: 403 },
    );
  }

  const validIds = ships.map((s) => s.id);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No eligible ships found" }, { status: 404 });
  }

  const [economy, user] = await Promise.all([
    getEconomyConfig(),
    prisma.user.findUnique({ where: { id: userId! }, select: { purchasedShipCount: true } }),
  ]);

  const earnCredit = (user?.purchasedShipCount ?? 0) >= economy.purchaseThresholdForRewards;
  const creditEarned = earnCredit ? validIds.length * economy.recycleRewardUtc : 0;

  await prisma.$transaction([
    prisma.ship.deleteMany({ where: { id: { in: validIds } } }),
    ...(creditEarned > 0
      ? [prisma.user.update({
          where: { id: userId! },
          data: { creditBalance: { increment: creditEarned } },
        })]
      : []),
  ]);

  return NextResponse.json({ recycled: validIds.length, creditEarned });
}
