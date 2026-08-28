/**
 * POST /api/roguelike/run/retreat
 *
 * Web2 counterpart to RoguelikeMatch.retreatRun — ends the current run.
 * If a combat match is in progress, it's abandoned first (GamePhase
 * ABANDONED, no winner recorded — distinct from a loss) before the run
 * itself ends, matching web3's two-step "forfeit the match, then end the
 * run" semantics in one call (web2 has no per-call gas/latency reason to
 * split it into two requests the way the on-chain flow does).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const run = await prisma.roguelikeRun.findFirst({
    where: { userId: userId!, status: "ACTIVE" },
    include: { roster: true },
  });
  if (!run) {
    return NextResponse.json({ error: "No active run" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (run.activeLobbyId) {
      const game = await tx.game.findUnique({ where: { lobbyId: run.activeLobbyId } });
      if (game && game.phase === "ACTIVE") {
        await tx.game.update({ where: { id: game.id }, data: { phase: "ABANDONED" } });
      }
      const fleets = await tx.fleet.findMany({ where: { lobbyId: run.activeLobbyId } });
      await tx.ship.updateMany({
        where: { id: { in: fleets.flatMap((f) => f.shipIds) } },
        data: { inFleet: false },
      });
    }
    await tx.roguelikeRun.update({
      where: { id: run.id },
      data: { status: "ENDED", endedAt: new Date(), activeLobbyId: null },
    });
    await tx.ship.updateMany({
      where: { id: { in: run.roster.map((r) => r.shipId) } },
      data: { inFleet: false },
    });
  });

  return NextResponse.json({ ok: true });
}
