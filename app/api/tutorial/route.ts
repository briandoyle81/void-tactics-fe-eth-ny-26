import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { calcShipCost } from "@/app/lib/shipCosts";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";

// Tutorial reward ships — identical to the player ships used in the tutorial.
// Each spec matches the corresponding entry in app/data/tutorialShips.ts.
const RESOLUTE_SPEC = {
  name: "Resolute",
  equipment: { mainWeapon: 3, armor: 0, shields: 2, special: 1 },
  traits: { accuracy: 2, hull: 2, speed: 2, serialNumber: 1001, colors: { h1: 200, s1: 80, l1: 50, h2: 220, s2: 70, l2: 40 }, variant: 1 },
  shiny: true,
};
const VIGILANT_SPEC = {
  name: "Vigilant",
  equipment: { mainWeapon: 1, armor: 0, shields: 1, special: 2 },
  traits: { accuracy: 1, hull: 0, speed: 0, serialNumber: 1002, colors: { h1: 250, s1: 90, l1: 60, h2: 270, s2: 80, l2: 50 }, variant: 1 },
  shiny: false,
};
const SENTINEL_SPEC = {
  name: "Sentinel",
  equipment: { mainWeapon: 0, armor: 2, shields: 0, special: 0 },
  traits: { accuracy: 1, hull: 0, speed: 0, serialNumber: 1003, colors: { h1: 150, s1: 70, l1: 55, h2: 170, s2: 60, l2: 45 }, variant: 1 },
  shiny: false,
};

// Win (sniper): Resolute + Vigilant. Loss (retreat): all three.
const REWARD_SPECS = {
  win:  [RESOLUTE_SPEC, VIGILANT_SPEC],
  loss: [RESOLUTE_SPEC, VIGILANT_SPEC, SENTINEL_SPEC],
} as const;

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

  const specs = REWARD_SPECS[path];
  const costs = await getCurrentCosts();

  const ships = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId! },
      data: { tutorialCompleted: true, tutorialPath: path },
    }),
    ...specs.map((spec) => {
      const cost = calcShipCost(spec.equipment, spec.traits, costs);
      return prisma.ship.create({
        data: {
          ownerId: userId!,
          name: spec.name,
          equipment: spec.equipment as never,
          traits: { ...spec.traits, serialNumber: spec.traits.serialNumber.toString() } as never,
          cost,
          costsVersion: costs.version,
          shiny: spec.shiny,
          isFree: true,
          constructed: true,
        },
      });
    }),
  ]);

  // ships[0] is the user update result; ships[1..n] are the ship records
  const createdShips = (ships as unknown[]).slice(1) as Array<{ id: number; name: string }>;
  const shipCount = createdShips.length;

  return NextResponse.json(
    { path, shipCount, ships: createdShips.map((s) => ({ id: s.id, name: s.name })) },
    { status: 201 },
  );
}
