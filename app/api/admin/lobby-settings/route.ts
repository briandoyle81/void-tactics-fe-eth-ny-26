import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { getLobbySettings, invalidateLobbySettingsCache } from "@/app/lib/lobbySettings";

// GET /api/admin/lobby-settings — admin-only read of the full settings
// object (LobbyAdminPanelWeb2 needs the current stale-lobby threshold to
// display/prefill). The `paused` half is also readable publicly via
// GET /api/lobbies/player-state; this route is the admin-only superset.
export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const settings = await getLobbySettings();
  return NextResponse.json(settings);
}

// PUT /api/admin/lobby-settings — admin-only write for the lobby-creation
// pause kill-switch and the stale-lobby-prune threshold. Web2-mode
// counterpart to the LobbyManager contract's admin `pause`/`unpause` and
// `setStaleLobbyThreshold` calls, gated on WEB2_ADMIN_EMAILS instead of
// contract ownership. Either field may be sent alone — omitted fields keep
// their current stored value.
export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const current = await getLobbySettings();
  const next = { ...current };

  if (body?.paused !== undefined) {
    if (typeof body.paused !== "boolean") {
      return NextResponse.json({ error: "paused must be a boolean" }, { status: 400 });
    }
    next.paused = body.paused;
  }
  if (body?.staleLobbyThresholdDays !== undefined) {
    if (typeof body.staleLobbyThresholdDays !== "number" || body.staleLobbyThresholdDays <= 0) {
      return NextResponse.json({ error: "staleLobbyThresholdDays must be a positive number" }, { status: 400 });
    }
    next.staleLobbyThresholdDays = body.staleLobbyThresholdDays;
  }

  await prisma.config.upsert({
    where: { key: "lobby_settings" },
    create: { key: "lobby_settings", value: next },
    update: { value: next },
  });
  invalidateLobbySettingsCache();

  return NextResponse.json({ ok: true, ...next });
}
