import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { getCurrentCostsByVariant } from "@/app/lib/getCurrentCosts";
import { recalcStaleShips } from "@/app/lib/recalcStaleShips";

const DEFAULT_TAKE = 100;
const MAX_TAKE = 200;

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const idsParam = searchParams.get("ids");

  // ?ids= path: fetch specific ships by ID, no pagination
  if (idsParam) {
    const ids = idsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
    const [dbShips, costsByVariant] = await Promise.all([
      prisma.ship.findMany({ where: { id: { in: ids }, ownerId: userId!, destroyed: false } }),
      getCurrentCostsByVariant(),
    ]);
    const updatedCosts = await recalcStaleShips(dbShips, costsByVariant);
    const ships = dbShips.map((s) => {
      const updated = updatedCosts.get(s.id);
      return dbShipToShip(updated ? { ...s, cost: updated.cost, costsVersion: updated.costsVersion } : s);
    });
    return new NextResponse(stringifyWithBigint(ships), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // General path: cursor-based pagination ordered by id desc
  const takeParam = Number(searchParams.get("take") ?? DEFAULT_TAKE);
  const take = Math.min(Math.max(1, isNaN(takeParam) ? DEFAULT_TAKE : takeParam), MAX_TAKE);
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  const [dbShips, costsByVariant] = await Promise.all([
    prisma.ship.findMany({
      where: {
        ownerId: userId!,
        destroyed: false,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: take + 1, // fetch one extra to detect if there's a next page
    }),
    getCurrentCostsByVariant(),
  ]);

  const hasMore = dbShips.length > take;
  const page = hasMore ? dbShips.slice(0, take) : dbShips;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  const updatedCosts = await recalcStaleShips(page, costsByVariant);
  const ships = page.map((s) => {
    const updated = updatedCosts.get(s.id);
    return dbShipToShip(updated ? { ...s, cost: updated.cost, costsVersion: updated.costsVersion } : s);
  });

  return new NextResponse(stringifyWithBigint({ ships, nextCursor }), {
    headers: { "Content-Type": "application/json" },
  });
}
