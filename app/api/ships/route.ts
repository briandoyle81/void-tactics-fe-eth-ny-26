import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { dbShipToShip } from "@/app/lib/dbToType";
import { stringifyWithBigint } from "@/app/lib/bigintJson";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
    : null;

  const dbShips = await prisma.ship.findMany({
    where: {
      ownerId: userId!,
      destroyed: false,
      ...(ids ? { id: { in: ids } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return new NextResponse(stringifyWithBigint(dbShips.map(dbShipToShip)), {
    headers: { "Content-Type": "application/json" },
  });
}
