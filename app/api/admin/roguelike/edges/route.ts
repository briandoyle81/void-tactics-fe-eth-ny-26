import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// POST/DELETE /api/admin/roguelike/edges — web2 counterpart to
// RoguelikeNodeMap.addChild/removeChild. Incremental edge-by-edge editor,
// no bulk replace, same as the on-chain contract.

export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const parentId = Number(body?.parentId);
  const childId = Number(body?.childId);
  const twoWay = body?.twoWay === true;
  if (!Number.isInteger(parentId) || !Number.isInteger(childId)) {
    return NextResponse.json({ error: "parentId and childId are required" }, { status: 400 });
  }

  const edge = await prisma.roguelikeEdge.upsert({
    where: { parentId_childId: { parentId, childId } },
    create: { parentId, childId, twoWay },
    update: { twoWay },
  });
  return NextResponse.json(edge, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const parentId = Number(body?.parentId);
  const childId = Number(body?.childId);
  if (!Number.isInteger(parentId) || !Number.isInteger(childId)) {
    return NextResponse.json({ error: "parentId and childId are required" }, { status: 400 });
  }

  await prisma.roguelikeEdge.deleteMany({ where: { parentId, childId } });
  return NextResponse.json({ ok: true });
}
