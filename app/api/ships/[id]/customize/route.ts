import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { calcShipCost } from "@/app/lib/shipCosts";
import { getCurrentCosts } from "@/app/lib/getCurrentCosts";
import {
  countNewModifications,
  calculateCustomizeCost,
  validateCustomization,
  type ShipEquipmentInput,
  type ShipTraitsInput,
} from "@/app/lib/customizeCost";

type Params = { params: Promise<{ id: string }> };

// GET /api/ships/:id/customize?mainWeapon=&armor=&shields=&special=&accuracy=&hull=&speed=&shiny=
// Returns cost preview without making any changes.
export async function GET(req: NextRequest, { params }: Params) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const shipId = Number(id);
  if (isNaN(shipId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ship = await prisma.ship.findFirst({ where: { id: shipId, ownerId: userId! } });
  if (!ship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = req.nextUrl.searchParams;
  const currentEquip = ship.equipment as unknown as ShipEquipmentInput;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTraitsRaw = ship.traits as any;
  const proposed: { equipment: ShipEquipmentInput; traits: ShipTraitsInput; shiny: boolean } = {
    equipment: {
      mainWeapon: Number(q.get("mainWeapon") ?? currentEquip.mainWeapon),
      armor:      Number(q.get("armor")      ?? currentEquip.armor),
      shields:    Number(q.get("shields")    ?? currentEquip.shields),
      special:    Number(q.get("special")    ?? currentEquip.special),
    },
    traits: {
      accuracy: Number(q.get("accuracy") ?? currentTraitsRaw.accuracy ?? 0),
      hull:     Number(q.get("hull")     ?? currentTraitsRaw.hull ?? 0),
      speed:    Number(q.get("speed")    ?? currentTraitsRaw.speed ?? 0),
    },
    shiny: q.has("shiny") ? q.get("shiny") === "true" : ship.shiny,
  };

  const validationError = validateCustomization(proposed.equipment, proposed.traits);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const current = {
    equipment: currentEquip,
    traits: { accuracy: currentTraitsRaw.accuracy ?? 0, hull: currentTraitsRaw.hull ?? 0, speed: currentTraitsRaw.speed ?? 0 } as ShipTraitsInput,
    shiny: ship.shiny,
  };

  const newMods = countNewModifications(current, proposed);
  const cost = calculateCustomizeCost(ship.modifiedCount, newMods);

  return NextResponse.json({ cost, newMods, totalModsAfter: ship.modifiedCount + newMods });
}

// POST /api/ships/:id/customize
// Body: { equipment, traits, shiny? }
export async function POST(req: NextRequest, { params }: Params) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const shipId = Number(id);
  if (isNaN(shipId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    equipment: ShipEquipmentInput;
    traits: ShipTraitsInput;
    shiny?: boolean;
  };

  const { equipment, traits } = body;
  const shiny = body.shiny;

  const validationError = validateCustomization(equipment, traits);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const ship = await prisma.ship.findFirst({ where: { id: shipId, ownerId: userId! } });
  if (!ship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ship.constructed) return NextResponse.json({ error: "Ship must be constructed before modifying" }, { status: 409 });
  if (ship.inFleet) return NextResponse.json({ error: "Cannot modify a ship that is in a fleet" }, { status: 409 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingTraitsRaw = ship.traits as any;
  const current = {
    equipment: ship.equipment as unknown as ShipEquipmentInput,
    traits: { accuracy: existingTraitsRaw.accuracy ?? 0, hull: existingTraitsRaw.hull ?? 0, speed: existingTraitsRaw.speed ?? 0 } as ShipTraitsInput,
    shiny: ship.shiny,
  };
  const proposed = {
    equipment,
    traits,
    shiny: shiny !== undefined ? shiny : ship.shiny,
  };

  const newMods = countNewModifications(current, proposed);
  if (newMods === 0) return NextResponse.json({ error: "No changes detected" }, { status: 400 });

  const cost = calculateCustomizeCost(ship.modifiedCount, newMods);

  const user = await prisma.user.findUnique({ where: { id: userId! }, select: { creditBalance: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.creditBalance < cost) {
    return NextResponse.json({ error: "Insufficient UTC balance", required: cost, available: user.creditBalance }, { status: 402 });
  }

  // Recalculate fleet cost with new traits/equipment
  const costs = await getCurrentCosts();
  const newCost = calcShipCost(equipment, traits, costs);

  // Preserve serial number, colors, variant from existing traits
  const newTraits = {
    serialNumber: existingTraitsRaw.serialNumber,
    colors: existingTraitsRaw.colors,
    variant: existingTraitsRaw.variant ?? 0,
    accuracy: traits.accuracy,
    hull: traits.hull,
    speed: traits.speed,
  };

  const [updatedShip] = await prisma.$transaction([
    prisma.ship.update({
      where: { id: shipId },
      data: {
        equipment: equipment as never,
        traits: newTraits as never,
        shiny: proposed.shiny,
        modifiedCount: { increment: newMods },
        cost: newCost,
      },
    }),
    prisma.user.update({
      where: { id: userId! },
      data: { creditBalance: { decrement: cost } },
    }),
  ]);

  return NextResponse.json(dbShipToShip(updatedShip));
}
