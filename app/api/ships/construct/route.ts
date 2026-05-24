import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// POST /api/ships/construct
// Body: { all: true } OR { shipIds: number[] }
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json() as { all?: boolean; shipIds?: number[] };

  if (body.all) {
    const result = await prisma.ship.updateMany({
      where: { ownerId: userId!, constructed: false, destroyed: false },
      data: { constructed: true },
    });
    return NextResponse.json({ constructed: result.count });
  }

  if (!body.shipIds || body.shipIds.length === 0) {
    return NextResponse.json({ error: "Provide all:true or shipIds" }, { status: 400 });
  }

  const result = await prisma.ship.updateMany({
    where: {
      id: { in: body.shipIds },
      ownerId: userId!,
      constructed: false,
      destroyed: false,
    },
    data: { constructed: true },
  });

  return NextResponse.json({ constructed: result.count });
}
