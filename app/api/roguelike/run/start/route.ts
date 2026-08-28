/**
 * POST /api/roguelike/run/start
 *
 * Web2 counterpart to RoguelikeMatch.startRun — commits a roster (single
 * variant, cost <= campaign.initialCostCap) to a new run. One active run
 * per player, app-enforced (matches the contract's RunAlreadyActive
 * revert).
 *
 * Body: { campaignId: number, shipIds: number[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: { campaignId?: number; shipIds?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const campaignId = Number(body.campaignId);
  const shipIds = body.shipIds ?? [];
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (shipIds.length === 0) {
    return NextResponse.json({ error: "Select at least one ship for your roster" }, { status: 400 });
  }

  const existing = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a run in progress" }, { status: 409 });
  }

  const campaign = await prisma.roguelikeCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "This campaign isn't set up yet" }, { status: 404 });
  }
  if (!campaign.rootNodeId) {
    return NextResponse.json({ error: "This campaign isn't set up yet" }, { status: 400 });
  }

  const ships = await prisma.ship.findMany({ where: { id: { in: shipIds }, ownerId: userId! } });
  if (ships.length !== shipIds.length) {
    return NextResponse.json({ error: "One or more ships not found" }, { status: 400 });
  }
  if (ships.some((s) => s.destroyed || !s.constructed)) {
    return NextResponse.json(
      { error: "Roster contains an unconstructed or destroyed ship" },
      { status: 400 },
    );
  }
  const variants = new Set(
    ships.map((s) => (s.traits as { variant?: number })?.variant).filter((v) => v != null),
  );
  if (variants.size > 1) {
    return NextResponse.json(
      { error: "A roster can't mix ships from different factions" },
      { status: 400 },
    );
  }
  const rosterVariant = [...variants][0] ?? 0;
  if (campaign.requiredVariant > 0 && rosterVariant !== campaign.requiredVariant) {
    return NextResponse.json(
      { error: `This campaign requires Faction ${campaign.requiredVariant} fleet` },
      { status: 400 },
    );
  }
  const totalCost = ships.reduce((sum, s) => sum + s.cost, 0);
  if (totalCost > campaign.initialCostCap) {
    return NextResponse.json(
      { error: `Roster cost exceeds this campaign's ${campaign.initialCostCap} limit` },
      { status: 400 },
    );
  }

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.roguelikeRun.create({
      data: {
        userId: userId!,
        campaignId,
        currentNodeId: campaign.rootNodeId!,
        currentCostCap: campaign.initialCostCap,
        status: "ACTIVE",
      },
    });
    await tx.roguelikeRosterShip.createMany({
      data: shipIds.map((shipId) => ({ runId: created.id, shipId, hp: 0 })),
    });
    await tx.ship.updateMany({ where: { id: { in: shipIds } }, data: { inFleet: true } });
    return created;
  });

  return NextResponse.json({ run }, { status: 201 });
}
