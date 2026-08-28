import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { InsufficientBalanceError } from "@/app/lib/InsufficientBalanceError";
import { nextTierCost, MAX_TIER } from "@/app/lib/droneStorefrontTiers";

// POST /api/drone-storefront/turn-in — web2 counterpart to
// DroneStorefront.turnInCores. Unlike web3 (where the caller must pass the
// exact next-tier cost and a mismatch reverts WrongAmount), there's no
// client-guessed amount here — the server always charges the correct cost
// for the caller's own next tier, no body needed.
export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { droneCoreTier: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.droneCoreTier >= MAX_TIER) {
    return NextResponse.json({ error: "Max tier reached" }, { status: 409 });
  }
  const cost = nextTierCost(user.droneCoreTier)!;
  const newTier = user.droneCoreTier + 1;

  try {
    await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: userId!, decBalance: { gte: cost } },
        data: { decBalance: { decrement: cost }, droneCoreTier: newTier },
      });
      if (debited.count === 0) throw new InsufficientBalanceError();
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient DEC balance", required: cost }, { status: 402 });
    }
    throw e;
  }

  return NextResponse.json({ tier: newTier });
}
