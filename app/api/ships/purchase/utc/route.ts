import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateShip } from "@/app/lib/shipGen";
import { PURCHASE_TIERS } from "@/app/lib/purchaseTiers";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { tier } = await req.json() as { tier: number };
  const tierConfig = PURCHASE_TIERS.find((t) => t.tier === tier);
  if (!tierConfig) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId! } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.creditBalance < tierConfig.priceUtc) {
    return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
  }

  const costs = await getCurrentCosts();

  const [, ...ships] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId! },
      data: { creditBalance: { decrement: tierConfig.priceUtc } },
    }),
    ...Array.from({ length: tierConfig.shipCount }, (_, i) => {
      const { name, equipment, traits, cost, costsVersion, shiny } = generateShip(userId!, i, costs);
      return prisma.ship.create({
        data: {
          ownerId: userId!,
          name,
          equipment: equipment as never,
          traits: { ...traits, serialNumber: traits.serialNumber.toString() } as never,
          cost,
          costsVersion,
          shiny,
          constructed: false,
        },
      });
    }),
  ]);

  return NextResponse.json(
    { ships: ships.map((s) => ({ id: s.id, name: s.name })) },
    { status: 201 },
  );
}
