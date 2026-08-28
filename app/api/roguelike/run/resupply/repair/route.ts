/**
 * POST /api/roguelike/run/resupply/repair
 *
 * Web2 counterpart to RoguelikeResupply.resupplyRepair — charges
 * User.creditBalance (the web2 UTC-equivalent currency) for the roster's
 * total missing HP at the current repairCostPerHp, then zeroes it
 * (0 = undamaged/full). Only callable while standing at a Resupply node.
 *
 * Body: { shipIds?: number[] } — repairs only these roster ships if given,
 * else the whole roster.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getRoguelikeSettings } from "@/app/lib/roguelikeSettings";
import { InsufficientBalanceError } from "@/app/lib/InsufficientBalanceError";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: { shipIds?: number[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
    include: { roster: true },
  });
  if (!run) {
    return NextResponse.json({ error: "No active run" }, { status: 404 });
  }
  const node = await prisma.roguelikeNode.findUnique({ where: { id: run.currentNodeId } });
  if (!node || node.kind !== 1) {
    return NextResponse.json({ error: "You must be at a resupply node to repair" }, { status: 400 });
  }

  const targetEntries = body.shipIds?.length
    ? run.roster.filter((r) => body.shipIds!.includes(r.shipId))
    : run.roster;
  const toRepair = targetEntries.filter((r) => r.hp > 0);
  if (toRepair.length === 0) {
    return NextResponse.json({ error: "Nothing to repair" }, { status: 400 });
  }

  const { repairCostPerHp } = await getRoguelikeSettings();
  const totalDamage = toRepair.reduce((sum, r) => sum + r.hp, 0);
  const cost = totalDamage * repairCostPerHp;

  try {
    await prisma.$transaction(async (tx) => {
      if (cost > 0) {
        const debited = await tx.user.updateMany({
          where: { id: userId!, creditBalance: { gte: cost } },
          data: { creditBalance: { decrement: cost } },
        });
        if (debited.count === 0) throw new InsufficientBalanceError();
      }
      await Promise.all(
        toRepair.map((r) =>
          tx.roguelikeRosterShip.update({ where: { id: r.id }, data: { hp: 0 } }),
        ),
      );
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
    }
    throw e;
  }

  return NextResponse.json({ repaired: toRepair.map((r) => r.shipId), cost });
}
