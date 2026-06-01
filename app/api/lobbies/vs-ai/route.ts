/**
 * POST /api/lobbies/vs-ai
 *
 * Creates a lobby for a human vs. AI game.
 * - Human player is the creator (player 1, goes first).
 * - AI is the joiner (player 2), joins immediately.
 * - AI fleet is generated inline within the cost limit.
 *
 * The human then submits their fleet via the existing
 * POST /api/lobbies/[id]/fleet endpoint, which auto-starts the game.
 *
 * Body: { difficulty, costLimit?, maxScore?, mapId? }
 * Response: { lobbyId }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { AI_USER_ID, ensureAiUser } from "@/app/lib/aiUser";
import { generateAiFleet } from "@/app/lib/aiFleetGen";
import type { AiDifficulty } from "@/app/utils/aiDispatch";

const VALID_DIFFICULTIES: AiDifficulty[] = [
  "recruit",
  "veteran",
  "commander",
  "elite",
];

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  let body: {
    difficulty: string;
    costLimit?: number;
    maxScore?: number;
    mapId?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { difficulty, costLimit = 0, maxScore = 3, mapId } = body;

  if (!VALID_DIFFICULTIES.includes(difficulty as AiDifficulty)) {
    return NextResponse.json(
      { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(", ")}` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(costLimit) || (costLimit !== 0 && (costLimit < 500 || costLimit > 3000))) {
    return NextResponse.json({ error: "Invalid costLimit" }, { status: 400 });
  }
  if (!Number.isInteger(maxScore) || maxScore < 1) {
    return NextResponse.json({ error: "Invalid maxScore" }, { status: 400 });
  }

  await ensureAiUser();

  // Create the lobby with AI already as joiner
  const lobby = await prisma.lobby.create({
    data: {
      creatorId: userId!,
      joinerId: AI_USER_ID,
      isAiGame: true,
      aiDifficulty: difficulty,
      costLimit,
      maxScore,
      mapId: mapId ?? null,
      status: "FLEET_SELECTION",
      joinedAt: new Date(),
    },
  });

  // Generate and persist AI fleet
  await generateAiFleet(lobby.id, costLimit, difficulty as AiDifficulty, mapId ?? null);

  return NextResponse.json({ lobbyId: lobby.id }, { status: 201 });
}
