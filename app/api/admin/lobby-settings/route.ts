import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { invalidateLobbySettingsCache } from "@/app/lib/lobbySettings";

// PUT /api/admin/lobby-settings — admin-only write for the lobby-creation
// pause kill-switch. Web2-mode counterpart to the LobbyManager contract's
// admin `pause`/`unpause` calls, gated on WEB2_ADMIN_EMAILS instead of
// contract ownership. Reading the current value happens through
// GET /api/lobbies/player-state (public to any signed-in user, since the
// create-lobby button needs it), not here.
export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  if (typeof body?.paused !== "boolean") {
    return NextResponse.json({ error: "paused must be a boolean" }, { status: 400 });
  }

  await prisma.config.upsert({
    where: { key: "lobby_settings" },
    create: { key: "lobby_settings", value: { paused: body.paused } },
    update: { value: { paused: body.paused } },
  });
  invalidateLobbySettingsCache();

  return NextResponse.json({ ok: true, paused: body.paused });
}
