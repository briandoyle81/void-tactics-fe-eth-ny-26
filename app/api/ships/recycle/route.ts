import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// POST /api/ships/recycle
// Body: { shipIds: number[] }
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { shipIds } = await req.json() as { shipIds: number[] };
  if (!shipIds || shipIds.length === 0) {
    return NextResponse.json({ error: "No ship IDs provided" }, { status: 400 });
  }

  const result = await prisma.ship.deleteMany({
    where: {
      id: { in: shipIds },
      ownerId: userId!,
      inFleet: false,
    },
  });

  return NextResponse.json({ recycled: result.count });
}
