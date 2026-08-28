/**
 * POST /api/roguelike/run/nodes/[id]/enter-combat
 *
 * Web2 counterpart to RoguelikeMatch.enterCombatNode — the roster is
 * already locked in from run-start, so only starting positions are
 * submitted here. Roster ships carry damage sustained in earlier missions
 * this run (RoguelikeRosterShip.hp) into the new Game via
 * createGameFromLobby's startingDamageByShipId.
 *
 * Body: { startingPositions: [{row, col}] } (indexed to match the roster's
 * shipId order, same convention as web3's positions[] argument)
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

  const targetNodeId = Number((await params).id);
  if (!Number.isInteger(targetNodeId)) {
    return NextResponse.json({ error: "Invalid node id" }, { status: 400 });
  }

  let body: { startingPositions?: Array<{ row: number; col: number }> };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const startingPositions = body.startingPositions ?? [];

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
    include: { roster: true },
  });
  if (!run) {
    return NextResponse.json({ error: "No active run" }, { status: 404 });
  }
  if (run.activeLobbyId) {
    return NextResponse.json({ error: "A match is already in progress" }, { status: 409 });
  }

  const node = await prisma.roguelikeNode.findUnique({ where: { id: targetNodeId } });
  if (!node || node.kind !== 0 || node.mapId == null) {
    return NextResponse.json({ error: "This node isn't a combat node" }, { status: 400 });
  }

  const isCurrent = targetNodeId === run.currentNodeId;
  if (!isCurrent) {
    const edge = await prisma.roguelikeEdge.findFirst({
      where: {
        OR: [
          { parentId: run.currentNodeId, childId: targetNodeId },
          { parentId: targetNodeId, childId: run.currentNodeId, twoWay: true },
        ],
      },
    });
    if (!edge) {
      return NextResponse.json(
        { error: "This node isn't reachable from your current position" },
        { status: 400 },
      );
    }
  }

  const alreadyDefeated = await prisma.roguelikeNodeDefeat.findUnique({
    where: { runId_nodeId: { runId: run.id, nodeId: targetNodeId } },
  });
  if (alreadyDefeated) {
    return NextResponse.json(
      { error: "This node has already been cleared and can't be re-fought" },
      { status: 409 },
    );
  }

  const hasPlacements = await prisma.aIMapPlacement.findFirst({ where: { mapId: node.mapId } });
  if (!hasPlacements) {
    return NextResponse.json({ error: "This node has no AI content configured yet" }, { status: 400 });
  }

  await ensureAiUser();

  const shipIds = run.roster.map((r) => r.shipId);
  const totalCost = (
    await prisma.ship.findMany({ where: { id: { in: shipIds } }, select: { cost: true } })
  ).reduce((sum, s) => sum + s.cost, 0);

  const lobby = await prisma.lobby.create({
    data: {
      creatorId: userId!,
      joinerId: AI_USER_ID,
      isAiGame: true,
      roguelikeRunId: run.id,
      mapId: node.mapId,
      costLimit: run.currentCostCap,
      turnTimeSeconds: node.turnTimeSeconds ?? 120,
      maxScore: node.maxScore ?? 50,
      creatorGoesFirst: node.creatorGoesFirst ?? true,
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

  const startingDamageByShipId = new Map(run.roster.map((r) => [r.shipId, r.hp]));
  const gameId = await createGameFromLobby(
    { ...lobby, joinerId: lobby.joinerId! },
    humanFleet,
    aiFleet,
    startingDamageByShipId,
  );

  await prisma.roguelikeRun.update({
    where: { id: run.id },
    data: { currentNodeId: targetNodeId, activeLobbyId: lobby.id },
  });

  return NextResponse.json({ lobbyId: lobby.id, gameId }, { status: 201 });
}
