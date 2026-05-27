import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getEconomyConfig } from "@/app/lib/economyConfig";

// GET /api/lobbies/player-state
// Returns lobby-economy state for the current user: kickCount, kickTimeoutUntil,
// lobbiesCreatedCount, freeGamesPerAddress, and lobbyCreationCostUtc.
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user, economy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId! },
      select: { kickCount: true, kickTimeoutUntil: true, lobbiesCreatedCount: true },
    }),
    getEconomyConfig(),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    kickCount: user.kickCount,
    kickTimeoutUntil: user.kickTimeoutUntil?.toISOString() ?? null,
    lobbiesCreatedCount: user.lobbiesCreatedCount,
    freeGamesPerAddress: economy.freeGamesPerAddress,
    lobbyCreationCostUtc: economy.lobbyCreationCostUtc,
  });
}
