/**
 * GET /api/roguelike/repair-cost
 *
 * Player-facing (non-admin) read of the current repairCostPerHp — needed
 * by the resupply panel to preview repair cost before committing.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getRoguelikeSettings } from "@/app/lib/roguelikeSettings";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await getRoguelikeSettings();
  return NextResponse.json(settings);
}
