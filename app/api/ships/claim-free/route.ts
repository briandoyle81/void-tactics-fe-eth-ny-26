import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateShip } from "@/app/lib/shipGen";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";

const FREE_SHIPS_PER_CLAIM = 10;
// Cooldown before a user can claim again (28 days in ms)
const CLAIM_COOLDOWN_MS = 28 * 24 * 60 * 60 * 1000;

/** Thrown inside the Serializable transaction below when the re-checked
 * cooldown hasn't expired. Rolls back the transaction; caught to return 409. */
class ClaimCooldownError extends Error {}

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
  // Drone Storefront's permanent claim bonus (docs/faction-2.md §4) —
  // mirrors web3's FreeShipClaim minting 10 + DroneStorefront.droneCoreTier.
  const user = await prisma.user.findUnique({ where: { id: userId! }, select: { droneCoreTier: true } });
  const shipsToMint = FREE_SHIPS_PER_CLAIM + (user?.droneCoreTier ?? 0);

  try {
    const ships = await prisma.$transaction(
      async (tx) => {
        // Re-check the cooldown inside the transaction — the check above is
        // just a fast pre-check for the common case. Under Serializable
        // isolation, Postgres detects the read-write conflict if a
        // concurrent claim (same ownerId) commits new Ship rows between this
        // read and our own inserts, and aborts one side with a P2034 write
        // conflict (caught below) instead of letting both claims through.
        const newest = await tx.ship.findFirst({
          where: { ownerId: userId! },
          orderBy: { createdAt: "desc" },
        });
        if (newest && Date.now() - newest.createdAt.getTime() < CLAIM_COOLDOWN_MS) {
          throw new ClaimCooldownError();
        }

        return Promise.all(
          Array.from({ length: shipsToMint }, (_, i) => {
            const { name, equipment, traits, cost, costsVersion, shiny } = generateShip(userId!, i, costs);
            return tx.ship.create({
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ ships: ships.map((s) => ({ id: s.id, name: s.name })) }, { status: 201 });
  } catch (e) {
    if (e instanceof ClaimCooldownError) {
      return NextResponse.json({ error: "Already claimed. Cooldown not expired." }, { status: 409 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return NextResponse.json(
        { error: "Claim conflicted with another request — please try again." },
        { status: 409 },
      );
    }
    throw e;
  }
}
