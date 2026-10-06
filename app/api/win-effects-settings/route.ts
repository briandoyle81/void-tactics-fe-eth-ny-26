import { NextResponse } from "next/server";
import { getWinEffectsSettings } from "@/app/lib/winEffectsWeb2";

// GET /api/win-effects-settings — public, read-only view of the global
// win-effect numbers a player sees in a mission's dossier (DEC bonus,
// heal-above-floor %, granted ship variant/tier). Web2 counterpart to the
// public view functions on DECBonusWinEffect/HealAboveFloorWinEffect/
// ShipGrantWinEffect. Editing stays admin-only at
// /api/admin/win-effects-settings.
export async function GET() {
  const settings = await getWinEffectsSettings();
  return NextResponse.json({
    decBonusAmount: settings.decBonusAmount,
    healAboveFloorPercent: settings.healAboveFloorPercent,
    shipGrantVariant: settings.shipGrantVariant,
    shipGrantTier: settings.shipGrantTier,
  });
}
