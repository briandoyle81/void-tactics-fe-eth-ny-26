/**
 * POST /api/roguelike/run/resupply/roster
 *
 * Web2 counterpart to RoguelikeResupply.resupplyModifyRoster — add/remove
 * ships from the run's roster, re-validated against currentCostCap. Only
 * callable while standing at a Resupply node.
 *
 * Body: { addShipIds?: number[], removeShipIds?: number[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: { addShipIds?: number[]; removeShipIds?: number[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const addShipIds = body.addShipIds ?? [];
  const removeShipIds = body.removeShipIds ?? [];

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
    include: { roster: true, campaign: true },
  });
  if (!run) {
    return NextResponse.json({ error: "No active run" }, { status: 404 });
  }
  const node = await prisma.roguelikeNode.findUnique({ where: { id: run.currentNodeId } });
  if (!node || node.kind !== 1) {
    return NextResponse.json(
      { error: "You must be at a resupply node to modify your roster" },
      { status: 400 },
    );
  }

  if (addShipIds.length > 0) {
    const newShips = await prisma.ship.findMany({ where: { id: { in: addShipIds }, ownerId: userId! } });
    if (newShips.length !== addShipIds.length) {
      return NextResponse.json({ error: "One or more ships not found" }, { status: 400 });
    }
    if (newShips.some((s) => s.destroyed || !s.constructed || s.inFleet)) {
      return NextResponse.json(
        { error: "One or more ships are unavailable (destroyed, unconstructed, or already in a fleet)" },
        { status: 400 },
      );
    }
    if (run.campaign.requiredVariant > 0) {
      const wrongVariant = newShips.some(
        (s) => (s.traits as { variant?: number })?.variant !== run.campaign.requiredVariant,
      );
      if (wrongVariant) {
        return NextResponse.json(
          { error: `This campaign requires Faction ${run.campaign.requiredVariant} ships` },
          { status: 400 },
        );
      }
    }
  }

  const remainingRoster = run.roster.filter((r) => !removeShipIds.includes(r.shipId));
  const remainingShipIds = remainingRoster.map((r) => r.shipId);
  const addedShips = addShipIds.length
    ? await prisma.ship.findMany({ where: { id: { in: addShipIds } }, select: { id: true, cost: true } })
    : [];
  const remainingShips = remainingShipIds.length
    ? await prisma.ship.findMany({ where: { id: { in: remainingShipIds } }, select: { cost: true } })
    : [];
  const newTotalCost =
    remainingShips.reduce((sum, s) => sum + s.cost, 0) + addedShips.reduce((sum, s) => sum + s.cost, 0);
  if (newTotalCost > run.currentCostCap) {
    return NextResponse.json(
      { error: `Roster cost would exceed this run's ${run.currentCostCap} limit` },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    if (removeShipIds.length > 0) {
      await tx.roguelikeRosterShip.deleteMany({ where: { runId: run.id, shipId: { in: removeShipIds } } });
      await tx.ship.updateMany({ where: { id: { in: removeShipIds } }, data: { inFleet: false } });
    }
    if (addShipIds.length > 0) {
      await tx.roguelikeRosterShip.createMany({
        data: addShipIds.map((shipId) => ({ runId: run.id, shipId, hp: 0 })),
      });
      await tx.ship.updateMany({ where: { id: { in: addShipIds } }, data: { inFleet: true } });
    }
  });

  return NextResponse.json({ ok: true });
}
