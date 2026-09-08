import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { isWinEffectKey } from "@/app/lib/winEffectsWeb2";

// PUT /api/admin/roguelike/nodes/[id]/win-effects — admin-only, full-replace
// of one node's win-effect list. Web2 counterpart to
// RoguelikeNodeMap.setNodeWinEffects — kept separate from the main node PUT
// route (which is a full-replace of kind/mapId/etc.) since on-chain this is
// its own contract call, not part of updateNode.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const id = Number((await params).id);
  const body = (await req.json()) as { winEffects?: unknown };
  if (!Array.isArray(body.winEffects) || !body.winEffects.every(isWinEffectKey)) {
    return NextResponse.json({ error: "winEffects must be an array of known win-effect keys" }, { status: 400 });
  }

  const node = await prisma.roguelikeNode.update({
    where: { id },
    data: { winEffects: body.winEffects },
  });
  return NextResponse.json(node);
}
