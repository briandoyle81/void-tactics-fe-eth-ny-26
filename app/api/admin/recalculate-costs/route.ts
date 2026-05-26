import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DEFAULT_COSTS, calcShipCost, type CostsConfig } from "@/app/lib/shipCosts";
import { MAP_ADMIN_EMAILS } from "@/app/config/alpha";

/**
 * POST /api/admin/recalculate-costs
 * Re-stamps every ship's cost + costsVersion using the current DB cost config
 * (or code defaults if no config row exists yet).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !MAP_ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await prisma.config.findUnique({ where: { key: "ship_costs" } });
  const costs: CostsConfig = row ? (row.value as CostsConfig) : DEFAULT_COSTS;

  const ships = await prisma.ship.findMany({
    select: { id: true, equipment: true, traits: true },
  });

  const updates = ships.flatMap((ship) => {
    const equipment = ship.equipment as { mainWeapon: number; armor: number; shields: number; special: number };
    const traits = ship.traits as { accuracy: number; hull: number; speed: number };
    if (equipment.mainWeapon === undefined || traits.accuracy === undefined) return [];
    return [prisma.ship.update({
      where: { id: ship.id },
      data: { cost: calcShipCost(equipment, traits, costs), costsVersion: costs.version },
    })];
  });

  await prisma.$transaction(updates);

  return NextResponse.json({ updated: updates.length, costsVersion: costs.version });
}
