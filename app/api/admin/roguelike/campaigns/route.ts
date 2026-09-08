import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET/POST /api/admin/roguelike/campaigns — web2 counterpart to
// RoguelikeNodeMap's createCampaign/setCampaignRoot/setCampaignAutoHealPercent/
// setCampaignRequiredVariant/setCampaignInitialCostCap.

export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const campaigns = await prisma.roguelikeCampaign.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const requiredVariant = Number(body?.requiredVariant ?? 0);
  const autoHealPercent = Number(body?.autoHealPercent ?? 0);
  const initialCostCap = Number(body?.initialCostCap);
  if (!Number.isInteger(initialCostCap) || initialCostCap < 0) {
    return NextResponse.json({ error: "Invalid initialCostCap" }, { status: 400 });
  }

  const campaign = await prisma.roguelikeCampaign.create({
    data: { requiredVariant, autoHealPercent, initialCostCap },
  });
  return NextResponse.json(campaign, { status: 201 });
}
