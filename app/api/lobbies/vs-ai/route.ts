/**
 * POST /api/lobbies/vs-ai
 *
 * Creates a lobby for a human vs. AI game — the web2 counterpart to the
 * web3 flow (Lobbies.createLobby reserved for SinglePlayerMatch ->
 * acceptMatch -> human fleet -> setupAIFleet). Since web2 has no
 * transaction-confirmation latency to work around, this collapses that
 * multi-step chain into one call: the human is the creator, the AI joins
 * immediately as the joiner, and the AI's fleet (sourced from
 * AIShipConfig/AIMapPlacement — the web2 counterpart to AIEncounters, same
 * default fleet as web3) is generated immediately. The human then submits
 * their fleet via the existing POST /api/lobbies/[id]/fleet, which
 * auto-starts the game — its own comment already anticipates this ordering
 * ("AI fleet is pre-generated, so it's always first").
 *
 * Body: { costLimit?, maxScore?, turnTimeSeconds?, mapId }
 * Response: { lobbyId }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getEconomyConfig } from "@/app/lib/economyConfig";
import { getLobbySettings } from "@/app/lib/lobbySettings";
import { InsufficientBalanceError } from "@/app/lib/InsufficientBalanceError";
import { AI_USER_ID, ensureAiUser } from "@/app/lib/aiUser";
import { generateAiFleetForMap, NoAIPlacementsError } from "@/app/lib/aiFleetWeb2";

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: { costLimit?: number; maxScore?: number; turnTimeSeconds?: number; mapId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { costLimit = 1000, maxScore = 50, turnTimeSeconds = 120, mapId } = body;

  if (!Number.isInteger(mapId) || (mapId as number) <= 0) {
    return NextResponse.json({ error: "mapId is required" }, { status: 400 });
  }
  if (!Number.isInteger(turnTimeSeconds) || turnTimeSeconds < 60 || turnTimeSeconds > 86400) {
    return NextResponse.json({ error: "turnTimeSeconds must be between 60 and 86400" }, { status: 400 });
  }
  if (!Number.isInteger(maxScore) || maxScore < 50 || maxScore > 200) {
    return NextResponse.json({ error: "maxScore must be between 50 and 200" }, { status: 400 });
  }
  if (!Number.isInteger(costLimit) || costLimit < 500 || costLimit > 3000) {
    return NextResponse.json({ error: "costLimit must be between 500 and 3000" }, { status: 400 });
  }

  const hasPlacements = await prisma.aIMapPlacement.findFirst({ where: { mapId } });
  if (!hasPlacements) {
    return NextResponse.json({ error: "No AI content configured for that map" }, { status: 400 });
  }

  const [economy, lobbySettings, user] = await Promise.all([
    getEconomyConfig(),
    getLobbySettings(),
    prisma.user.findUnique({ where: { id: userId! } }),
    ensureAiUser(),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (lobbySettings.paused) {
    return NextResponse.json({ error: "Lobby creation is currently paused" }, { status: 403 });
  }
  if (user.kickTimeoutUntil && user.kickTimeoutUntil > new Date()) {
    return NextResponse.json(
      { error: "You are temporarily blocked from creating lobbies due to a timeout penalty" },
      { status: 403 },
    );
  }

  // A vs-AI lobby is treated as a reserved lobby (fee-wise, same as
  // web3 — confirmed there's no fee exemption for the AI address) since it
  // never sits open for anyone else to join.
  const isFreeCreate = user.lobbiesCreatedCount < economy.freeGamesPerAddress;
  const creationCost = (isFreeCreate ? 0 : economy.lobbyCreationCostUtc) + economy.reservationFeeUtc;
  if (creationCost > 0 && user.creditBalance < creationCost) {
    return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
  }

  let lobbyId: number;
  try {
    lobbyId = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: {
          id: userId!,
          ...(creationCost > 0 ? { creditBalance: { gte: creationCost } } : {}),
        },
        data: {
          lobbiesCreatedCount: { increment: 1 },
          ...(creationCost > 0 ? { creditBalance: { decrement: creationCost } } : {}),
        },
      });
      if (debited.count === 0) throw new InsufficientBalanceError();

      const lobby = await tx.lobby.create({
        data: {
          creatorId: userId!,
          joinerId: AI_USER_ID,
          isAiGame: true,
          costLimit: Number(costLimit),
          turnTimeSeconds: Number(turnTimeSeconds),
          creatorGoesFirst: true,
          mapId: Number(mapId),
          maxScore: Number(maxScore),
          status: "FLEET_SELECTION",
          joinedAt: new Date(),
        },
      });
      return lobby.id;
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient UTC balance" }, { status: 402 });
    }
    throw e;
  }

  try {
    await generateAiFleetForMap(lobbyId, Number(mapId));
  } catch (e) {
    if (e instanceof NoAIPlacementsError) {
      // Shouldn't happen given the check above, but the map's placements
      // could theoretically be edited away between the check and here.
      return NextResponse.json({ error: "No AI content configured for that map" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ lobbyId }, { status: 201 });
}
