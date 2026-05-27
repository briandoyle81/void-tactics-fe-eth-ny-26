import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { generateShip } from "@/app/lib/shipGen";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";

const REWARD_SHIPS: Record<"win" | "loss", number> = { win: 2, loss: 3 };

// GET /api/tutorial — return this user's tutorial completion status
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { tutorialCompleted: true, tutorialPath: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    completed: user.tutorialCompleted,
    path: user.tutorialPath ?? null,
  });
}

// POST /api/tutorial — record completion + award reward ships (idempotent: 409 if already done)
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const path = body.path as "win" | "loss" | undefined;
  if (path !== "win" && path !== "loss") {
    return NextResponse.json({ error: "path must be 'win' or 'loss'" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { tutorialCompleted: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.tutorialCompleted) {
    return NextResponse.json({ error: "Tutorial already completed" }, { status: 409 });
  }

  const shipCount = REWARD_SHIPS[path];
  const costs = await getCurrentCosts();

  const ships = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId! },
      data: { tutorialCompleted: true, tutorialPath: path },
    }),
    ...Array.from({ length: shipCount }, (_, i) => {
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
          isFree: true,
          constructed: true,
        },
      });
    }),
  ]);

  // ships[0] is the user update result; ships[1..n] are the ship records
  const createdShips = (ships as unknown[]).slice(1) as Array<{ id: number; name: string }>;

  return NextResponse.json(
    { path, shipCount, ships: createdShips.map((s) => ({ id: s.id, name: s.name })) },
    { status: 201 },
  );
}
