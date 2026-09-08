import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { getRoguelikeSettings, invalidateRoguelikeSettingsCache } from "@/app/lib/roguelikeSettings";

// GET/PUT /api/admin/roguelike-settings — admin-only read/write for
// repairCostPerHp. Web2-mode counterpart to RoguelikeResupply's owner-only
// setRepairCostPerHP, gated on WEB2_ADMIN_EMAILS instead of contract
// ownership.

export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const settings = await getRoguelikeSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const repairCostPerHp = Number(body?.repairCostPerHp);
  if (!Number.isInteger(repairCostPerHp) || repairCostPerHp < 0) {
    return NextResponse.json({ error: "repairCostPerHp must be a non-negative integer" }, { status: 400 });
  }

  await prisma.config.upsert({
    where: { key: "roguelike_settings" },
    create: { key: "roguelike_settings", value: { repairCostPerHp } },
    update: { value: { repairCostPerHp } },
  });
  invalidateRoguelikeSettingsCache();

  return NextResponse.json({ ok: true, repairCostPerHp });
}
