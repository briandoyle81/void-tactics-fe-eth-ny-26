import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateShip } from "@/app/lib/shipGen";
import { getGuaranteedKillsForTierShip } from "@/app/lib/purchaseTiers";
import { getPurchaseTiers } from "@/app/lib/getPurchaseTiers";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";
import { InsufficientBalanceError } from "@/app/lib/InsufficientBalanceError";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { tier } = await req.json() as { tier: number };
  const purchaseTiers = await getPurchaseTiers();
  const tierConfig = purchaseTiers.find((t) => t.tier === tier);
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

  let ships;
  try {
    ships = await prisma.$transaction(async (tx) => {
      // Atomic conditional debit — see InsufficientBalanceError.
      const debited = await tx.user.updateMany({
        where: { id: userId!, creditBalance: { gte: tierConfig.priceUtc } },
        data: {
          creditBalance: { decrement: tierConfig.priceUtc },
          purchasedShipCount: { increment: tierConfig.shipCount },
        },
      });
      if (debited.count === 0) throw new InsufficientBalanceError();

      return Promise.all(
        Array.from({ length: tierConfig.shipCount }, (_, i) => {
          const { name, equipment, traits, cost, costsVersion, shiny } = generateShip(userId!, i, costs);
          const shipsDestroyed = getGuaranteedKillsForTierShip(tierConfig.tier, i);
          return tx.ship.create({
            data: {
              ownerId: userId!,
              name,
              equipment: equipment as never,
              traits: { ...traits, serialNumber: traits.serialNumber.toString() } as never,
              cost,
              costsVersion,
              shiny,
              isFree: false,
              constructed: false,
              shipsDestroyed,
            },
          });
        }),
      );
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
    }
    throw e;
  }

  return NextResponse.json(
    { ships: ships.map((s) => ({ id: s.id, name: s.name })) },
    { status: 201 },
  );
}
