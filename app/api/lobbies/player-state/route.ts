import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getEconomyConfig } from "@/app/lib/economyConfig";
import { getLobbySettings } from "@/app/lib/lobbySettings";

// GET /api/lobbies/player-state
// Returns lobby-economy state for the current user: kickCount, kickTimeoutUntil,
// lobbiesCreatedCount, freeGamesPerAddress, lobbyCreationCostUtc,
// reservationFeeUtc, and paused (the admin lobby-creation kill-switch —
// public to any signed-in user since the create-lobby button needs it).
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user, economy, lobbySettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId! },
      select: { kickCount: true, kickTimeoutUntil: true, lobbiesCreatedCount: true },
    }),
    getEconomyConfig(),
    getLobbySettings(),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    kickCount: user.kickCount,
    kickTimeoutUntil: user.kickTimeoutUntil?.toISOString() ?? null,
    lobbiesCreatedCount: user.lobbiesCreatedCount,
    freeGamesPerAddress: economy.freeGamesPerAddress,
    lobbyCreationCostUtc: economy.lobbyCreationCostUtc,
    reservationFeeUtc: economy.reservationFeeUtc,
    paused: lobbySettings.paused,
  });
}
