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
  if (!Number.isInteger(requiredVariant) || requiredVariant < 0) {
    return NextResponse.json({ error: "Invalid requiredVariant" }, { status: 400 });
  }

  const campaign = await prisma.campaign.update({ where: { id }, data: { requiredVariant } });
  return NextResponse.json(campaign);
}
