import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// POST /api/ships/[id]/construct
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const shipId = Number(id);
  if (isNaN(shipId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ship = await prisma.ship.findFirst({ where: { id: shipId, ownerId: userId! } });
  if (!ship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ship.constructed) return NextResponse.json({ error: "Already constructed" }, { status: 409 });

  const updated = await prisma.ship.update({
    where: { id: shipId },
    data: { constructed: true },
  });

  return NextResponse.json({ id: updated.id, constructed: true });
}
