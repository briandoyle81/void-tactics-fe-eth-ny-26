import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { calculateAttributesFromContracts } from "@/app/utils/shipAttributesCalculator";
import { stringifyWithBigint } from "@/app/lib/bigintJson";

// GET /api/ships/attributes?ids=1,2,3
export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const dbShips = await prisma.ship.findMany({
    where: { id: { in: ids }, ownerId: userId! },
  });

  const result: Record<string, ReturnType<typeof calculateAttributesFromContracts>> = {};
  for (const db of dbShips) {
    result[db.id] = calculateAttributesFromContracts(dbShipToShip(db));
  }
  return new NextResponse(stringifyWithBigint(result), {
    headers: { "Content-Type": "application/json" },
  });
}
