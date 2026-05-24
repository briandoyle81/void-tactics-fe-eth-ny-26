import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// DELETE /api/ships/[id] — recycle (ship breaker)
export async function DELETE(
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
  if (ship.inFleet) return NextResponse.json({ error: "Cannot recycle a ship that is in a fleet" }, { status: 409 });

  await prisma.ship.update({
    where: { id: shipId },
    data: { destroyed: true, destroyedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
