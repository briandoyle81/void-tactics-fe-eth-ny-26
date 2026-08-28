import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const id = Number((await params).id);
  const body = await req.json();
  const requiredVariant = Number(body?.requiredVariant ?? 0);
  const autoHealPercent = Number(body?.autoHealPercent ?? 0);
  const initialCostCap = Number(body?.initialCostCap);
  const rootNodeId = body?.rootNodeId != null ? Number(body.rootNodeId) : null;
  if (!Number.isInteger(initialCostCap) || initialCostCap < 0) {
    return NextResponse.json({ error: "Invalid initialCostCap" }, { status: 400 });
  }

  const campaign = await prisma.roguelikeCampaign.update({
    where: { id },
    data: { requiredVariant, autoHealPercent, initialCostCap, rootNodeId },
  });
  return NextResponse.json(campaign);
}
