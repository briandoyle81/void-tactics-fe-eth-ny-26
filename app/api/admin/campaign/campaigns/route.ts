import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET/POST /api/admin/campaign/campaigns — web2 counterpart to web3's
// NodeMap.createCampaign/campaignRequiredVariant, gated the same way as
// the other web2 admin routes (requireWeb2Admin).

export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const campaigns = await prisma.campaign.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const requiredVariant = Number(body?.requiredVariant ?? 0);
  if (!Number.isInteger(requiredVariant) || requiredVariant < 0) {
    return NextResponse.json({ error: "Invalid requiredVariant" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({ data: { requiredVariant } });
  return NextResponse.json(campaign, { status: 201 });
}
