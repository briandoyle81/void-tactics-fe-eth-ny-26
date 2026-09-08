import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { nextTierCost, MAX_TIER } from "@/app/lib/droneStorefrontTiers";

// GET /api/drone-storefront — web2 counterpart to useDroneStorefront.ts's
// on-chain droneCoreTier/tierCoreCost/DEC-balance reads.
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { decBalance: true, droneCoreTier: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cost = nextTierCost(user.droneCoreTier);

  return NextResponse.json({
    tier: user.droneCoreTier,
    decBalance: user.decBalance,
    nextTierCost: cost,
    maxTierReached: user.droneCoreTier >= MAX_TIER,
  });
}
