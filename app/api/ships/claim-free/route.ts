import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateShip } from "@/app/lib/shipGen";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";

const FREE_SHIPS_PER_CLAIM = 10;
// Cooldown before a user can claim again (28 days in ms)
const CLAIM_COOLDOWN_MS = 28 * 24 * 60 * 60 * 1000;

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const existingShips = await prisma.ship.count({ where: { ownerId: userId! } });
  if (existingShips === 0) {
    return NextResponse.json({ eligible: true, nextClaimAt: null });
  }

  const newest = await prisma.ship.findFirst({
    where: { ownerId: userId! },
    orderBy: { createdAt: "desc" },
  });
  if (!newest) {
    return NextResponse.json({ eligible: true, nextClaimAt: null });
  }

  const nextClaimAt = newest.createdAt.getTime() + CLAIM_COOLDOWN_MS;
  const eligible = Date.now() >= nextClaimAt;
  return NextResponse.json({ eligible, nextClaimAt: eligible ? null : nextClaimAt });
}

export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  // Check if user has already claimed recently
  const existingShips = await prisma.ship.count({ where: { ownerId: userId! } });
  if (existingShips > 0) {
    // Find the most recent ship to determine cooldown
    const newest = await prisma.ship.findFirst({
      where: { ownerId: userId! },
      orderBy: { createdAt: "desc" },
    });
    if (newest && Date.now() - newest.createdAt.getTime() < CLAIM_COOLDOWN_MS) {
      return NextResponse.json({ error: "Already claimed. Cooldown not expired." }, { status: 409 });
    }
  }

  const costs = await getCurrentCosts();

  const ships = await prisma.$transaction(
    Array.from({ length: FREE_SHIPS_PER_CLAIM }, (_, i) => {
      const { name, equipment, traits, cost, costsVersion, shiny } = generateShip(userId!, i, costs);
      return prisma.ship.create({
        data: {
          ownerId: userId!,
          name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          equipment: equipment as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          traits: { ...traits, serialNumber: traits.serialNumber.toString() } as any,
          cost,
          costsVersion,
          shiny,
          isFree: true,
          constructed: false,
        },
      });
    }),
  );

  return NextResponse.json({ ships: ships.map((s) => ({ id: s.id, name: s.name })) }, { status: 201 });
}
