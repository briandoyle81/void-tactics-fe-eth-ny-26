/**
 * GET /api/roguelike/campaigns/[id]
 *
 * Player-facing (non-admin) read of a RoguelikeCampaign's settings —
 * web2 counterpart to campaignRequiredVariant/campaignInitialCostCap/
 * campaignAutoHealPercent, needed by the run-start roster picker before
 * any run exists.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  const campaign = await prisma.roguelikeCampaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
}
