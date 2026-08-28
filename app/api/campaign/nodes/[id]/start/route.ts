/**
 * POST /api/campaign/nodes/[id]/start
 *
 * Web2 counterpart to SinglePlayerMatch.startNodeMatch — the roster and
 * starting positions are submitted together in one call (unlike vs-ai,
 * where the human's fleet is picked separately afterward), since a
 * campaign node match has no "wait for the other player" step: both
 * fleets (human + AI, sourced from AIMapPlacement/AIShipConfig same as
 * vs-ai) are created and the Game is started synchronously here.
 *
 * Body: { shipIds: number[], startingPositions: [{row, col}] }
 * Response: { lobbyId, gameId }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { AI_USER_ID, ensureAiUser } from "@/app/lib/aiUser";
import { generateAiFleetForMap, NoAIPlacementsError } from "@/app/lib/aiFleetWeb2";
import { createGameFromLobby } from "@/app/lib/createGameFromLobby";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const nodeId = Number((await params).id);
  if (!Number.isInteger(nodeId)) {
    return NextResponse.json({ error: "Invalid node id" }, { status: 400 });
  }

  let body: { shipIds?: number[]; startingPositions?: Array<{ row: number; col: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const shipIds = body.shipIds ?? [];
  const startingPositions = body.startingPositions ?? [];
  if (shipIds.length === 0) {
    return NextResponse.json({ error: "Select at least one ship" }, { status: 400 });
  }

  const node = await prisma.campaignNode.findUnique({
    where: { id: nodeId },
    include: { campaign: true },
  });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  if (node.prerequisites.length > 0) {
    const completedPrereqs = await prisma.campaignNodeCompletion.count({
      where: { userId: userId!, nodeId: { in: node.prerequisites } },
    });
    if (completedPrereqs === 0) {
      return NextResponse.json({ error: "This node is locked" }, { status: 403 });
    }
  }

  const ships = await prisma.ship.findMany({ where: { id: { in: shipIds }, ownerId: userId! } });
  if (ships.length !== shipIds.length) {
    return NextResponse.json({ error: "One or more ships not found" }, { status: 400 });
  }
  if (ships.some((s) => s.destroyed || !s.constructed)) {
    return NextResponse.json(
      { error: "Fleet contains an unconstructed or destroyed ship" },
      { status: 400 },
    );
  }
  if (node.campaign.requiredVariant > 0) {
    const wrongVariant = ships.some(
      (s) => (s.traits as { variant?: number })?.variant !== node.campaign.requiredVariant,
    );
    if (wrongVariant) {
      return NextResponse.json(
        { error: `This campaign requires Faction ${node.campaign.requiredVariant} ships` },
        { status: 400 },
      );
    }
  }
  const totalCost = ships.reduce((sum, s) => sum + s.cost, 0);
  if (totalCost > node.costLimit) {
    return NextResponse.json({ error: "Fleet cost exceeds this node's limit" }, { status: 400 });
  }

  const hasPlacements = await prisma.aIMapPlacement.findFirst({ where: { mapId: node.mapId } });
  if (!hasPlacements) {
    return NextResponse.json({ error: "This node has no AI content configured yet" }, { status: 400 });
  }

  await ensureAiUser();

  const lobby = await prisma.lobby.create({
    data: {
      creatorId: userId!,
      joinerId: AI_USER_ID,
      isAiGame: true,
      campaignNodeId: node.id,
      mapId: node.mapId,
      costLimit: node.costLimit,
      turnTimeSeconds: node.turnTimeSeconds,
      maxScore: node.maxScore,
      creatorGoesFirst: node.creatorGoesFirst,
      status: "FLEET_SELECTION",
      joinedAt: new Date(),
    },
  });

  const humanFleet = await prisma.fleet.create({
    data: {
      ownerId: userId!,
      lobbyId: lobby.id,
      shipIds,
      totalCost,
      startingPositions,
      isComplete: true,
    },
  });
  await prisma.ship.updateMany({ where: { id: { in: shipIds } }, data: { inFleet: true } });

  try {
    await generateAiFleetForMap(lobby.id, node.mapId);
  } catch (e) {
    if (e instanceof NoAIPlacementsError) {
      return NextResponse.json({ error: "This node has no AI content configured yet" }, { status: 400 });
    }
    throw e;
  }

  const aiFleet = await prisma.fleet.findFirstOrThrow({
    where: { lobbyId: lobby.id, ownerId: AI_USER_ID },
  });

  const gameId = await createGameFromLobby(
    { ...lobby, joinerId: lobby.joinerId! },
    humanFleet,
    aiFleet,
  );

  return NextResponse.json({ lobbyId: lobby.id, gameId }, { status: 201 });
}
